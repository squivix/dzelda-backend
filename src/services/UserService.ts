import crypto from "crypto";
import {passwordHasher} from "@/src/server.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Language} from "@/src/models/entities/Language.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {StatusCodes} from "http-status-codes";
import {APIError} from "@/src/utils/errors/APIError.js";
import {EntityManager, EntityRepository} from "@mikro-orm/core";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";
import {AUTH_TOKEN_LENGTH} from "@/src/constants.js";


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

    async createUser(username: string, email: string, password: string, initialLanguageCode?: string) {
        const newUser = new User(username, email, await passwordHasher.hash(password));
        const newProfile = new Profile(newUser);
        this.userRepo.persist(newUser);
        this.profileRepo.persist(newProfile);
        if (initialLanguageCode) {
            const initialLanguage = await this.languageRepo.findOneOrFail({code: initialLanguageCode});
            newProfile.languagesLearning.add(initialLanguage);
        }
        await this.em.flush();
        return newUser;
    }

    async authenticateUser(username: string, password: string) {
        const user = await this.userRepo.findOne({username: username});

        if (user && await passwordHasher.validate(password, user.password)) {
            const token = crypto.randomBytes(AUTH_TOKEN_LENGTH).toString("hex");
            await this.em.upsert(Session, {user: user, token: token});
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
        return await this.em.findOne(Session, {token: sessionToken}, {populate: ["user", "user.profile", "user.profile.languagesLearning"]});
    }

    async deleteSession(session: Session) {
        await this.em.nativeDelete(Session, {id: session.id});
    }
}
