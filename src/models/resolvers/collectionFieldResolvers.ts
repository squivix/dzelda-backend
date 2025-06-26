import {FieldResolvers} from "@/src/models/viewResolver.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {profileFieldResolvers} from "@/src/models/resolvers/profileFieldResolvers.js";
import {textFieldResolvers} from "@/src/models/resolvers/textFieldResolvers.js";
import {languageFieldResolvers} from "@/src/models/resolvers/languageFieldResolvers.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {CollectionRepo} from "@/src/models/repos/CollectionRepo.js";


export const collectionFieldResolvers: FieldResolvers<Collection> = {
    id: {type: 'db'},
    title: {type: 'db'},
    description: {type: 'db'},
    image: {type: 'db'},
    addedOn: {type: 'db'},
    isPublic: {type: 'db'},
    avgPastViewersCountPerText: {type: 'formula'},
    language: {type: 'relation', populate: 'language', resolvers: languageFieldResolvers},
    addedBy: {type: 'relation', populate: 'addedBy', resolvers: profileFieldResolvers},
    texts: {type: 'relation', populate: 'texts', resolvers: textFieldResolvers},
    vocabsByLevel: {
        type: 'computed',
        resolve: async (collections, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            const repo = context.em.getRepository(Collection) as CollectionRepo;
            await repo.annotateVocabsByLevel(collections, context.user.profile.id);
        }
    },
    isBookmarked: {
        type: 'computed',
        resolve: async (collections, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            const repo = context.em.getRepository(Collection) as CollectionRepo;
            await repo.annotateIsBookmarked(collections, context.user.profile.id);
        }
    }
};
