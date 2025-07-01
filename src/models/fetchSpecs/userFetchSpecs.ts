import {profileFetchSpecs} from "@/src/models/fetchSpecs/profileFetchSpecs.js";
import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {User} from "@/src/models/entities/auth/User.js";


export const userFetchSpecs = () => ({
    id: {type: "db-column"},
    username: {type: "db-column"},
    email: {type: "db-column"},
    isEmailConfirmed: {type: "db-column"},
    isBanned: {type: "db-column"},
    isPendingEmailChange: {type: "formula"},
    profile: {type: "relation", populate: "profile", entityFetchSpecs: profileFetchSpecs, relationType: "to-one"}
}) as const satisfies  EntityFetchSpecs<User>

export type UserFetchSpecsType = ReturnType<typeof userFetchSpecs>;