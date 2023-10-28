import crypto from "crypto";
import {passwordHasher} from "@/src/utils/security/PasswordHasher.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Language} from "@/src/models/entities/Language.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {StatusCodes} from "http-status-codes";
import {APIError} from "@/src/utils/errors/APIError.js";
import {EntityManager, EntityRepository, FilterQuery, UniqueConstraintViolationException} from "@mikro-orm/core";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";
import {AUTH_TOKEN_LENGTH, EMAIL_CONFIRM_TOKEN_LENGTH, PASSWORD_RESET_TOKEN_LENGTH} from "@/src/constants.js";
import {EntityField} from "@mikro-orm/core/drivers/IDatabaseDriver.js";
import {PasswordResetToken} from "@/src/models/entities/auth/PasswordResetToken.js";
import {expiringTokenHasher} from "@/src/utils/security/ExpiringTokenHasher.js";
import {EmailConfirmationToken} from "@/src/models/entities/auth/EmailConfirmationToken.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {FastifyReply, FastifyRequest} from "fastify";


export class UserService {
    em: EntityManager;
    userRepo: EntityRepository<User>;
    profileRepo: EntityRepository<Profile>;
    languageRepo: EntityRepository<Language>;

    constructor(em: EntityManager) {
        this.em = em;
        this.userRepo = this.em.getRepository(User);
        this.profileRepo = this.em.getRepository(Profile);
        this.languageRepo = this.em.getRepository(Language);
    }

    async createUser(username: string, email: string, password: string) {
        const newUser = new User(username, email, await passwordHasher.hash(password));
        const newProfile = new Profile(newUser);
        this.em.persist(newUser);
        this.em.persist(newProfile);
        await this.em.flush();

        return newUser;
    }

    async authenticateUser(username: string, password: string) {
        const user = await this.userRepo.findOne({username: username});

        if (user && await passwordHasher.validate(password, user.password)) {
            const token = crypto.randomBytes(AUTH_TOKEN_LENGTH).toString("hex");
            await this.em.insert(Session, {user: user, token: token});
            await this.em.nativeUpdate(User, {id: user.id}, {lastLogin: "now()"});

            return token;
        } else {
            throw new APIError(
                StatusCodes.UNAUTHORIZED,
                "Username and/or password is incorrect",
                "The username and/or password you entered is incorrect"
            );
        }
    }

    async getUser(username: "me" | string, authenticatedUser: User | AnonymousUser | null) {
        let user: User | null;
        if (username == "me") {
            if (!authenticatedUser || authenticatedUser instanceof AnonymousUser)
                throw new UnauthenticatedAPIError(authenticatedUser);
            user = authenticatedUser;
        } else
            user = await this.em.findOne(User, {username: username}, {populate: ["profile", "profile.languagesLearning"]});

        return user;
    }

    async getLoginSession(sessionToken: string) {
        const session = await this.em.findOne(Session, {token: sessionToken}, {populate: ["user", "user.profile", "user.profile.languagesLearning"]});
        if (session === null)
            return null;
        if (session.isExpired) {
            await this.deleteLoginSession(session);
            return null;
        }
        return session;
    }

    async deleteLoginSession(session: Session) {
        await this.em.nativeDelete(Session, {id: session.id});
    }

    async findUser(where: FilterQuery<User>, fields: EntityField<User>[] = ["id", "email", "username"]) {
        return await this.userRepo.findOne(where, {fields});
    }

    async generateEmailConfirmToken(tokenData: { user: User, email: string }) {
        const emailConfirmToken = crypto.randomBytes(EMAIL_CONFIRM_TOKEN_LENGTH).toString("hex");

        if (await this.em.count(User, {id: {$ne: tokenData.user.id}, email: tokenData.email}) > 0)
            throw new ValidationAPIError({email: {message: "not unique"}});
        await this.em.nativeDelete(EmailConfirmationToken, {user: tokenData.user});
        await this.em.insert(EmailConfirmationToken, {
            user: tokenData.user,
            email: tokenData.email,
            token: await expiringTokenHasher.hash(emailConfirmToken)
        });
        return emailConfirmToken;
    }

    async confirmUserEmail(token: string) {
        const tokenHash = await expiringTokenHasher.hash(token);
        const tokenRecord = await this.em.findOne(EmailConfirmationToken, {
            token: tokenHash
        }, {populate: ["isExpired"]});

        if (tokenRecord == null)
            return null;
        if (tokenRecord.isExpired) {
            await this.em.nativeDelete(EmailConfirmationToken, {id: tokenRecord.id});
            return null;
        }
        await this.em.nativeUpdate(User, {emailConfirmToken: tokenRecord}, {isEmailConfirmed: true, email: tokenRecord.email});
        await this.em.nativeDelete(EmailConfirmationToken, {id: tokenRecord.id});

        return tokenRecord;
    }

    async generatePasswordResetToken(user: User) {
        const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString("hex");

        await this.em.nativeDelete(PasswordResetToken, {user});
        await this.em.insert(PasswordResetToken, {
            user: user,
            token: await expiringTokenHasher.hash(token)
        });
        return token;
    }

    async verifyPasswordResetToken(token: string) {
        const tokenHash = await expiringTokenHasher.hash(token);
        const tokenRecord = await this.em.findOne(PasswordResetToken, {
            token: tokenHash
        }, {populate: ["isExpired"]});

        if (tokenRecord == null)
            return null;
        if (tokenRecord.isExpired) {
            await this.em.nativeDelete(PasswordResetToken, {id: tokenRecord.id});
            return null;
        }
        return tokenRecord;
    }

    async resetPassword(token: string, newPassword: string) {
        const tokenRecord = await this.verifyPasswordResetToken(token);
        if (tokenRecord == null)
            return null;

        const user = await this.userRepo.findOne({passwordResetToken: tokenRecord});
        if (user == null)
            return null;

        user.password = await passwordHasher.hash(newPassword);
        this.em.remove(tokenRecord);
        await this.em.flush();
        return user;
    }

    async changeUserPassword(user: User, session: Session, oldPassword: string, newPassword: string) {
        if (await passwordHasher.validate(oldPassword, user.password)) {
            user.password = await passwordHasher.hash(newPassword);
            await this.em.flush();
            await this.em.nativeDelete(Session, {user: user, id: {$ne: session.id}});
        } else {
            throw new APIError(
                StatusCodes.UNAUTHORIZED,
                "Password is incorrect",
                "The password you entered is incorrect"
            );
        }
    }

    async changeUserEmail(user: User, newEmail: string) {
        if (user.email == newEmail)
            return;
        user.email = newEmail;
        user.isEmailConfirmed = false;
        await this.em.flush();
    }

    async deleteUserAccount(user: User) {
        this.em.remove(user);
        await this.em.flush();
    }

    async updateUserProfile(user: User, updatedProfileData: { bio: string, profilePicture?: string }) {
        user.profile.bio = updatedProfileData.bio;
        if (updatedProfileData.profilePicture !== undefined)
            user.profile.profilePicture = updatedProfileData.profilePicture;
        await this.em.flush();
    }
}
