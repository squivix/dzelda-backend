import crypto from "crypto";
import {passwordHasher} from "@/src/server.js";
import {User} from "@/src/models/entities/auth/User.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Language} from "@/src/models/entities/Language.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {StatusCodes} from "http-status-codes";
import {APIError} from "@/src/utils/errors/APIError.js";
import {EntityManager, EntityRepository} from "@mikro-orm/core";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";


class UserService {
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

    async getUser(username: "me" | string, authenticatedUser: User | null) {
        let user: User;
        if (username == "me") {
            if (!authenticatedUser) {
                throw new APIError(
                    StatusCodes.UNAUTHORIZED,
                    "Authentication required",
                    "User must be logged in"
                );
            }
            user = authenticatedUser;
        } else {
            user = await this.userRepo.findOneOrFail({username: username});
            await this.profileRepo.populate(user.profile, true);
            await this.em.flush();
        }

        return user;
    }

    async getUserBySession(sessionToken: string) {
        const user = await this.userRepo.findOneOrFail({session: {token: sessionToken}});
        await this.profileRepo.populate(user.profile, true);
        await this.em.flush();
        return user;
    }

    async authenticateUser(username: string, password: string) {
        const user = await this.userRepo.findOne({username: username});

        if (user && await passwordHasher.validate(password, user.password)) {
            const token = crypto.randomBytes(Number(process.env.AUTH_TOKEN_LENGTH)).toString("hex");
            await this.em.upsert(Session, {user: user, token: token});
            await this.em.flush();
            return token;
        } else {
            throw new APIError(
                StatusCodes.UNAUTHORIZED,
                "Username or password is incorrect",
                "The username or password you entered is incorrect"
            );
        }
    }

}

export default UserService;