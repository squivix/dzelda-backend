import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";
import {ttsPronunciationFetchSpecs} from "@/src/models/fetchSpecs/ttsPronunciationFetchSpecs.js";


export const vocabVariantFetchSpecs = () => ({
    id: {type: "db-column"},
    text: {type: "db-column"},
    ttsPronunciations: {
        type: "relation",
        populate: "ttsPronunciations",
        entityFetchSpecs: ttsPronunciationFetchSpecs,
        relationType: "to-many"
    },
}) as const satisfies EntityFetchSpecs<VocabVariant>

export type VocabVariantFetchSpecsType = ReturnType<typeof vocabVariantFetchSpecs>;