import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {profileFieldFieldFetchMap} from "@/src/models/fetchSpecs/profileFieldFieldFetchMap.js";
import {textFieldFetchMap} from "@/src/models/fetchSpecs/textFieldFetchMap.js";
import {languageFieldFetchMap} from "@/src/models/fetchSpecs/languageFieldFetchMap.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {CollectionRepo} from "@/src/models/repos/CollectionRepo.js";


export const collectionFieldFetchMap: FieldFetchSpecsMap<Collection> = {
    id: {type: 'db-column'},
    title: {type: 'db-column'},
    description: {type: 'db-column'},
    image: {type: 'db-column'},
    addedOn: {type: 'db-column'},
    isPublic: {type: 'db-column'},
    avgPastViewersCountPerText: {type: 'formula'},
    language: {type: 'relation', populate: 'language', fieldFetchSpecsMap: languageFieldFetchMap, relationType: "to-one"},
    addedBy: {type: 'relation', populate: 'addedBy', fieldFetchSpecsMap: profileFieldFieldFetchMap, relationType: "to-one"},
    texts: {type: 'relation', populate: 'texts', fieldFetchSpecsMap: textFieldFetchMap, relationType: "to-many"},
    vocabsByLevel: {
        type: 'annotated',
        annotate: async (collections, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            const repo = context.em.getRepository(Collection) as CollectionRepo;
            await repo.annotateVocabsByLevel(collections, context.user.profile.id);
        }
    },
    isBookmarked: {
        type: 'annotated',
        annotate: async (collections, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            const repo = context.em.getRepository(Collection) as CollectionRepo;
            await repo.annotateIsBookmarked(collections, context.user.profile.id);
        }
    }
};
