import {FieldResolvers} from "@/src/models/viewResolver.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {userFieldResolvers} from "@/src/models/resolvers/userFieldResolvers.js";
import {languageFieldResolvers} from "@/src/models/resolvers/languageFieldResolvers.js";


export const profileFieldResolvers: FieldResolvers<Profile> = {
    id: {type: 'db'},
    profilePicture: {type: "db"},
    bio: {type: "db"},
    isPublic: {type: "db"},
    user: {type: 'relation', populate: 'user', resolvers: userFieldResolvers},
    languagesLearning: {type: "relation", populate: "languagesLearning", resolvers: languageFieldResolvers}
};
