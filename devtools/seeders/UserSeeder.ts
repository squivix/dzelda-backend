import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {User} from "@/src/models/entities/auth/User.js";
import {batchSeed, syncIdSequence} from "@/devtools/seeders/utils.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {DATASET_MAP_LEARNER_LANGUAGE_FILE_NAME, DATASET_PROFILE_FILE_NAME, DATASET_USER_FILE_NAME} from "@/devtools/constants.js";
import path from "path";

export class UserSeeder extends Seeder {

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const usersFilePath = path.join(context.databaseDumpPath, DATASET_USER_FILE_NAME);
        const profilesFilePath = path.join(context.databaseDumpPath, DATASET_PROFILE_FILE_NAME);
        const mapLearnerLanguageFilePath = path.join(context.databaseDumpPath, DATASET_MAP_LEARNER_LANGUAGE_FILE_NAME);

        if (!await fs.exists(usersFilePath)) {
            console.error(`${usersFilePath} not found`);
            return;
        }
        // profile: EntityData<Profile>
        await batchSeed({
            filePath: usersFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertUsersBatch(em, batch as EntityData<User>[]),
            postSeed: async () => await syncIdSequence(em, "user"),
            resourceName: "user",
        });

        await batchSeed({
            filePath: profilesFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertProfileBatch(em, batch as EntityData<Profile>[]),
            postSeed: async () => await syncIdSequence(em, "profile"),
            resourceName: "profile",
        });

        await batchSeed({
            filePath: mapLearnerLanguageFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertMapLearnerLanguageBatch(em, batch as EntityData<MapLearnerLanguage>[]),
            postSeed: async () => await syncIdSequence(em, "map_learner_language"),
            resourceName: "learner-language mappings",
        });
    }

    private async insertUsersBatch(em: EntityManager, batch: EntityData<User>[]) {
        await em.insertMany(User, batch.map(userData => ({
            id: userData.id,
            username: userData.username,
            email: userData.email,
            password: userData.password,
            isStaff: userData.isStaff,
            isAdmin: userData.isAdmin,
            isEmailConfirmed: userData.isEmailConfirmed,
            accountCreatedAt: userData.accountCreatedAt,
            lastLogin: userData.lastLogin
        })));
    }

    private async insertProfileBatch(em: EntityManager, batch: EntityData<Profile>[]) {
        await em.insertMany(Profile, batch.map(profileData => ({
            id: profileData.id,
            profilePicture: profileData.profilePicture,
            user: profileData.id,
            bio: profileData.bio,
            isPublic: profileData.isPublic
        })));
    }

    private async insertMapLearnerLanguageBatch(em: EntityManager, batch: EntityData<MapLearnerLanguage>[]) {
        await em.insertMany(MapLearnerLanguage, batch.map(mappingData => ({
            learner: mappingData.learner,
            language: mappingData.language
        })))

    }
}
