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
        const usersFilePath = `${context.databaseDumpPath}/${UserSeeder.FILE_NAME}`;

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
        const profiles: EntityData<Profile>[] = [];
        const languageMappings: EntityData<MapLearnerLanguage>[] = [];
        await em.insertMany(User, batch.map(userData => {
            profiles.push({
                id: userData.profile.id,
                profilePicture: userData.profile.profilePicture,
                user: userData.id,
                bio: userData.profile.bio,
                isPublic: userData.profile.isPublic
            });
            languageMappings.push(...userData.profile.languagesLearning.map(language => ({
                learner: userData.profile.id!,
                language: language
            })))
            return {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                password: userData.password,
                isStaff: userData.isStaff,
                isAdmin: userData.isAdmin,
                isEmailConfirmed:userData.isEmailConfirmed,
                accountCreatedAt: userData.accountCreatedAt,
                lastLogin: userData.lastLogin
            };
        }))
        await em.insertMany(Profile, profiles);
        await em.insertMany(MapLearnerLanguage, languageMappings);
    }
}
