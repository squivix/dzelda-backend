import {orm, passwordHasher} from "../app.js";
import {User} from "../models/entities/auth/User.js";
import {Profile} from "../models/entities/Profile.js";
import {UseRequestContext} from "@mikro-orm/core";

class UserService {
    @UseRequestContext(() => orm)
    async createUser(username: string, email: string, password: string) {
        const userRepo = orm.em.getRepository(User);
        const profileRepo = orm.em.getRepository(Profile);
        const newUser = new User(username, email, await passwordHasher.hash(password));
        const newProfile = new Profile(newUser);
        userRepo.persist(newUser);
        profileRepo.persist(newProfile);
        await orm.em.flush();
        return newUser;
    }
}

export default new UserService();