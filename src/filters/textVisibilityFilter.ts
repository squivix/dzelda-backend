import {FilterQuery} from "@mikro-orm/core";
import {Text} from "@/src/models/entities/Text.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";

export function textVisibilityFilter(user: User | AnonymousUser | null): FilterQuery<Text> {
    if (user instanceof User) {
        return {
            $or: [
                {$and: [{collection: {$eq: null}}, {isPublic: true}]},
                {collection: {isPublic: true}},
                {addedBy: user.profile}
            ]
        };
    } else {
        return {
            $or: [
                {$and: [{collection: {$eq: null}}, {isPublic: true}]},
                {collection: {isPublic: true}},
            ]
        };
    }
}