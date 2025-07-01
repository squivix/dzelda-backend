import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {profileFetchSpecs} from "@/src/models/fetchSpecs/profileFetchSpecs.js";
import {textFetchSpecs} from "@/src/models/fetchSpecs/textFetchSpecs.js";
import {languageFetchSpecs} from "@/src/models/fetchSpecs/languageFetchSpecs.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {CollectionRepo} from "@/src/models/repos/CollectionRepo.js";


export const collectionFetchSpecs = () => ({
    id: {type: "db-column"},
    title: {type: "db-column"},
    description: {type: "db-column"},
    image: {type: "db-column"},
    addedOn: {type: "db-column"},
    isPublic: {type: "db-column"},
    avgPastViewersCountPerText: {type: "formula"},
    language: {type: "relation", populate: "language", relationType: "to-one", entityFetchSpecs: languageFetchSpecs},
    addedBy: {type: "relation", populate: "addedBy", entityFetchSpecs: profileFetchSpecs, relationType: "to-one"},
    texts: {type: "relation", populate: "texts", entityFetchSpecs: textFetchSpecs, relationType: "to-many"},
    vocabsByLevel: {
        type: "annotated",
        annotate: async (collections, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user");
            const repo = context.em.getRepository(Collection) as CollectionRepo;
            await repo.annotateVocabsByLevel(collections, context.user.profile.id);
        }
    },
    isBookmarked: {
        type: "annotated",
        annotate: async (collections, context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            const repo = context.em.getRepository(Collection) as CollectionRepo;
            await repo.annotateIsBookmarked(collections, context.user.profile.id);
        }
    }
}) as const satisfies EntityFetchSpecs<Collection>

export type CollectionFetchSpecsType = ReturnType<typeof collectionFetchSpecs>;