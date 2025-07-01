import {userFetchSpecs} from "@/src/models/fetchSpecs/userFetchSpecs.js";
import {languageFetchSpecs} from "@/src/models/fetchSpecs/languageFetchSpecs.js";
import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {Profile} from "@/src/models/entities/Profile.js";


export const profileFetchSpecs = () => ({
    id: {type: "db-column"},
    profilePicture: {type: "db-column"},
    bio: {type: "db-column"},
    isPublic: {type: "db-column"},
    user: {type: "relation", populate: "user", entityFetchSpecs: userFetchSpecs, relationType: "to-one"},
    languagesLearning: {type: "relation", populate: "languagesLearning", entityFetchSpecs: languageFetchSpecs, relationType: "to-many"},
}) as const satisfies  EntityFetchSpecs<Profile>

export type ProfileFetchSpecsType = ReturnType<typeof profileFetchSpecs>;