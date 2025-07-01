import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {languageFetchSpecs} from "@/src/models/fetchSpecs/languageFetchSpecs.js";
import {vocabTagFetchSpecs} from "@/src/models/fetchSpecs/vocabTagFetchSpecs.js";
import {meaningFetchSpecs} from "@/src/models/fetchSpecs/meaningFetchSpecs.js";
import {vocabVariantFetchSpecs} from "@/src/models/fetchSpecs/vocabVariantFetchSpecs.js";
import {ttsPronunciationFetchSpecs} from "@/src/models/fetchSpecs/ttsPronunciationFetchSpecs.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";

export const vocabFetchSpecs = () => ({
    id: {type: "db-column"},
    text: {type: "db-column"},
    isPhrase: {type: "db-column"},
    learnersCount: {type: "formula"},
    textsCount: {type: "formula"},

    language: ({type: "relation", populate: "language", entityFetchSpecs: languageFetchSpecs, relationType: "to-one"}),
    meanings: ({type: "relation", populate: "meanings", entityFetchSpecs: meaningFetchSpecs, relationType: "to-many"}),
    learnerMeanings: ({
        type: "relation",
        populate: "learnerMeanings",
        entityFetchSpecs: meaningFetchSpecs,
        relationType: "to-many",
        defaultContextFilter: (context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            return {learners: context.user.profile};
        }
    }),
    ttsPronunciations: {
        type: "relation",
        populate: "ttsPronunciations",
        entityFetchSpecs: ttsPronunciationFetchSpecs,
        relationType: "to-many"
    },
    tags: {type: "relation", populate: "tags", entityFetchSpecs: vocabTagFetchSpecs, relationType: "to-many"},
    vocabVariants: {type: "relation", populate: "vocabVariants", entityFetchSpecs: vocabVariantFetchSpecs, relationType: "to-many"},
}) as const satisfies EntityFetchSpecs<Vocab>

export type VocabFetchSpecsType = ReturnType<typeof vocabFetchSpecs>;