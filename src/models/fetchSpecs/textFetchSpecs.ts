import {Text} from "@/src/models/entities/Text.js";
import {profileFetchSpecs} from "@/src/models/fetchSpecs/profileFetchSpecs.js";
import {languageFetchSpecs} from "@/src/models/fetchSpecs/languageFetchSpecs.js";
import {collectionFetchSpecs} from "@/src/models/fetchSpecs/collectionFetchSpecs.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {TextRepo} from "@/src/models/repos/TextRepo.js";
import {EntityFetchSpecs} from "@/src/models/viewResolver.js";

export const textFetchSpecs = () => ({
    id: {type: "db-column"},
    title: {type: "db-column"},
    content: {type: "db-column"},
    parsedTitle: {type: "db-column"},
    parsedContent: {type: "db-column"},
    audio: {type: "db-column"},
    image: {type: "db-column"},
    orderInCollection: {type: "db-column"},
    isProcessing: {type: "db-column"},
    addedOn: {type: "db-column"},
    isPublic: {type: "db-column"},
    level: {type: "db-column"},
    isLastInCollection: {type: "formula"},
    pastViewersCount: {type: "formula"},
    language: ({type: "relation", populate: "language", entityFetchSpecs: languageFetchSpecs, relationType: "to-one"}),
    addedBy: ({type: "relation", populate: "addedBy", entityFetchSpecs: profileFetchSpecs, relationType: "to-one"}),
    collection: ({type: "relation", populate: "collection", entityFetchSpecs: collectionFetchSpecs, relationType: "to-one"}),
    vocabsByLevel: {
        type: "annotated",
        annotate: async (texts, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            const repo = context.em.getRepository(Text) as TextRepo;
            await repo.annotateVocabsByLevel(texts, context.user.profile.id);
        }
    },
    isBookmarked: {
        type: "annotated",
        annotate: async (texts, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            const repo = context.em.getRepository(Text) as TextRepo;
            await repo.annotateIsBookmarked(texts, context.user.profile.id);
        }
    }
}) as const satisfies EntityFetchSpecs<Text>

export type TextFetchSpecsType = ReturnType<typeof textFetchSpecs>;