import {FieldResolvers} from "@/src/models/viewResolver.js";
import {User} from "@/src/models/entities/auth/User.js";
import {profileFieldResolvers} from "@/src/models/resolvers/profileFieldResolvers.js";


export const userFieldResolvers: FieldResolvers<User> = {
    username: {type: "db"},
    email: {type: "db"},
    isEmailConfirmed: {type: "db"},
    isBanned: {type: "db"},
    isPendingEmailChange: {type: "formula"},
    profile: {type: "relation", populate: "profile", resolvers: profileFieldResolvers, relationType: "to-one"}
};