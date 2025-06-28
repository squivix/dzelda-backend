import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {User} from "@/src/models/entities/auth/User.js";
import {profileFieldFieldFetchMap} from "@/src/models/fetchSpecs/profileFieldFieldFetchMap.js";


export const userFieldFetchMap: FieldFetchSpecsMap<User> = {
    username: {type: "db-column"},
    email: {type: "db-column"},
    isEmailConfirmed: {type: "db-column"},
    isBanned: {type: "db-column"},
    isPendingEmailChange: {type: "formula"},
    profile: {type: "relation", populate: "profile", getFieldFetchSpecsMap: () => profileFieldFieldFetchMap, relationType: "to-one"}
};