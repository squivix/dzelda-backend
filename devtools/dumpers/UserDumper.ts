import {EntityManager} from "@mikro-orm/core";
import {batchDump} from "@/devtools/dumpers/utils.js";
import path from "path";
import {DATASET_PROFILE_FILE_NAME, DATASET_USER_FILE_NAME} from "@/devtools/constants.js";
import {User} from "@/src/models/entities/auth/User.js";
import {Profile} from "@/src/models/entities/Profile.js";

export async function dumpUsers({em, batchSize, dataPath}: { em: EntityManager, batchSize: number, dataPath: string }) {
    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_USER_FILE_NAME),
        entityClass: User,
        resourceName: "user",
        writeEntity: (user: User) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            password: user.password,
            isStaff: user.isStaff,
            isAdmin: user.isAdmin,
            isEmailConfirmed: user.isEmailConfirmed,
            accountCreatedAt: user.accountCreatedAt,
            lastLogin: user.lastLogin
        })
    })

    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_PROFILE_FILE_NAME),
        entityClass: Profile,
        resourceName: "profile",
        writeEntity: (profile: Profile) => ({
            id: profile.id,
            user: profile.user.id,
            profilePicture: profile.profilePicture,
            bio: profile.bio,
            isPublic: profile.isPublic
        })
    })
}