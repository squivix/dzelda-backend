import {FieldResolvers} from "@/src/models/viewResolver.js";
import {Text} from "@/src/models/entities/Text.js";
import {profileFieldResolvers} from "@/src/models/resolvers/profileFieldResolvers.js";
import {languageFieldResolvers} from "@/src/models/resolvers/languageFieldResolvers.js";
import {collectionFieldResolvers} from "@/src/models/resolvers/collectionFieldResolvers.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {TextRepo} from "@/src/models/repos/TextRepo.js";

export const textFieldResolvers: FieldResolvers<Text> = {
    id: {type: 'db'},
    title: {type: 'db'},
    content: {type: 'db'},
    parsedTitle: {type: 'db'},
    parsedContent: {type: 'db'},
    audio: {type: 'db'},
    image: {type: 'db'},
    orderInCollection: {type: 'db'},
    isProcessing: {type: 'db'},
    addedOn: {type: 'db'},
    isPublic: {type: 'db'},
    level: {type: 'db'},
    isLastInCollection: {type: 'formula'},
    pastViewersCount: {type: 'formula'},
    language: {type: "relation", populate: "language", resolvers: languageFieldResolvers, relationType: "to-one"},
    addedBy: {type: "relation", populate: "addedBy", resolvers: profileFieldResolvers, relationType: "to-one"},
    collection: {type: "relation", populate: "collection", resolvers: collectionFieldResolvers, relationType: "to-one"},
    vocabsByLevel: {
        type: 'computed',
        resolve: async (texts, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            const repo = context.em.getRepository(Text) as TextRepo;
            await repo.annotateVocabsByLevel(texts, context.user.profile.id);
        }
    },
    isBookmarked: {
        type: 'computed',
        resolve: async (texts, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            const repo = context.em.getRepository(Text) as TextRepo;
            await repo.annotateIsBookmarked(texts, context.user.profile.id);
        }
    }
}