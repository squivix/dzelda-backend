import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {Text} from "@/src/models/entities/Text.js";
import {profileFieldFieldFetchMap} from "@/src/models/fetchSpecs/profileFieldFieldFetchMap.js";
import {languageFieldFetchMap} from "@/src/models/fetchSpecs/languageFieldFetchMap.js";
import {collectionFieldFetchMap} from "@/src/models/fetchSpecs/collectionFieldFetchMap.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {TextRepo} from "@/src/models/repos/TextRepo.js";

export const textFieldFetchMap: FieldFetchSpecsMap<Text> = {
    id: {type: 'db-column'},
    title: {type: 'db-column'},
    content: {type: 'db-column'},
    parsedTitle: {type: 'db-column'},
    parsedContent: {type: 'db-column'},
    audio: {type: 'db-column'},
    image: {type: 'db-column'},
    orderInCollection: {type: 'db-column'},
    isProcessing: {type: 'db-column'},
    addedOn: {type: 'db-column'},
    isPublic: {type: 'db-column'},
    level: {type: 'db-column'},
    isLastInCollection: {type: 'formula'},
    pastViewersCount: {type: 'formula'},
    language: {type: "relation", populate: "language", fieldFetchSpecsMap: languageFieldFetchMap, relationType: "to-one"},
    addedBy: {type: "relation", populate: "addedBy", fieldFetchSpecsMap: profileFieldFieldFetchMap, relationType: "to-one"},
    collection: {type: "relation", populate: "collection", fieldFetchSpecsMap: collectionFieldFetchMap, relationType: "to-one"},
    vocabsByLevel: {
        type: 'annotated',
        annotate: async (texts, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            const repo = context.em.getRepository(Text) as TextRepo;
            await repo.annotateVocabsByLevel(texts, context.user.profile.id);
        }
    },
    isBookmarked: {
        type: 'annotated',
        annotate: async (texts, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            const repo = context.em.getRepository(Text) as TextRepo;
            await repo.annotateIsBookmarked(texts, context.user.profile.id);
        }
    }
}