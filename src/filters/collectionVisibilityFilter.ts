import {FilterQuery} from "@mikro-orm/core";
import {Collection} from "@/src/models/entities/Collection.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";

export function collectionVisibilityFilter(user: User | AnonymousUser | null): FilterQuery<Collection> {
    return user instanceof User ? { $or: [ { isPublic: true }, { addedBy: user.profile } ] } : { isPublic: true };
}
