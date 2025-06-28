import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {userFieldFetchMap} from "@/src/models/fetchSpecs/userFieldFetchMap.js";
import {languageFieldFetchMap} from "@/src/models/fetchSpecs/languageFieldFetchMap.js";


export const profileFieldFieldFetchMap: FieldFetchSpecsMap<Profile> = {
    id: {type: "db-column"},
    profilePicture: {type: "db-column"},
    bio: {type: "db-column"},
    isPublic: {type: "db-column"},
    user: {type: "relation", populate: "user", getFieldFetchSpecsMap: () => userFieldFetchMap, relationType: "to-one"},
    languagesLearning: {type: "relation", populate: "languagesLearning", getFieldFetchSpecsMap: () => languageFieldFetchMap, relationType: "to-many"}
};
