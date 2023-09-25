import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {User} from "@/src/models/entities/auth/User.js";
import {batchSeed, syncIdSequence} from "@/src/seeders/utils.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {Profile} from "@/src/models/entities/Profile.js";

export class UserSeeder extends Seeder {
    static readonly FILE_NAME = "users.jsonl";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const usersFilePath = `${context.datasetPath}/${UserSeeder.FILE_NAME}`;

        if (!await fs.exists(usersFilePath)) {
            console.error(`${usersFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: usersFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertBatch(em, batch as (EntityData<User> & {
                profile: EntityData<Profile> & { languagesLearning: number[] }
            })[]),
            postSeed: async () => {
                await syncIdSequence(em, "user");
                await syncIdSequence(em, "profile");
            },
            resourceName: "user",
        });
    }

    private async insertBatch(em: EntityManager, batch: (EntityData<User> & {
        profile: EntityData<Profile> & { languagesLearning: number[] }
    })[]) {
        const userFactory = new UserFactory(em);
        const users = batch.map(userData => {
            const user = userFactory.makeEntity({
                id: userData.id,
                username: userData.username,
                email: userData.email,
                password: userData.password,
                profile: userData.profile == null ? null : {
                    id: userData.profile.id,
                    profilePicture: userData.profile.profilePicture,
                    bio: userData.profile.bio,
                    isPublic: userData.profile.isPublic
                },
                isStaff: userData.isStaff,
                isAdmin: userData.isAdmin,
                accountCreatedAt: userData.accountCreatedAt,
                lastLogin: userData.lastLogin
            });
            userData.profile.languagesLearning!.forEach(language => em.create(MapLearnerLanguage, {
                learner: user.profile.id,
                language: language
            }));
            return user;
        });
        await em.persistAndFlush(users);
    }
}
