import {orm, passwordHasher} from "../app.js";
import {User} from "../models/entities/auth/User.js";

export default {
    async createUser(username: string, email: string, password: string) {
        const userRepo = orm.em.getRepository(User);
        const newUser = userRepo.create(new User(username, email, await passwordHasher.hash(password)));
        userRepo.persistAndFlush(newUser);
        return newUser;
    }
};
