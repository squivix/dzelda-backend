import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {User} from "@/src/models/entities/auth/User.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {syncIdSequence} from "@/src/seeders/utils.js";

export class UserSeeder extends Seeder {
    static readonly FILE_NAME = "users.json";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        if (!await fs.exists(`data/${UserSeeder.FILE_NAME}`))
            return;
        const users = await fs.readJSON(`data/${UserSeeder.FILE_NAME}`)
        const userFactory = new UserFactory(em)

        process.stdout.write("seeding users...");
        users.forEach((userData: EntityData<User>) => {
            em.persist(userFactory.makeEntity({
                id: userData.id,
                username: userData.username,
                email: userData.email,
                password: userData.password,
                profile: userData.profile,
                isStaff: userData.isStaff,
                isAdmin: userData.isAdmin,
                accountCreatedAt: userData.accountCreatedAt,
                lastLogin: userData.lastLogin
            }))
        })
        await em.flush();
        await syncIdSequence(em, "user")
        console.log("done");
    }
}