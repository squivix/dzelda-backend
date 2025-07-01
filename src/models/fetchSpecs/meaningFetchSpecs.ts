import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {vocabFetchSpecs} from "@/src/models/fetchSpecs/vocabFetchSpecs.js";
import {profileFetchSpecs} from "@/src/models/fetchSpecs/profileFetchSpecs.js";
import {languageFetchSpecs} from "@/src/models/fetchSpecs/languageFetchSpecs.js";
import {attributionSourceFetchSpecs} from "@/src/models/fetchSpecs/attributionSourceFetchSpecs.js";
import {vocabVariantFetchSpecs} from "@/src/models/fetchSpecs/vocabVariantFetchSpecs.js";
import {mapLearnerLanguageFetchSpecs} from "@/src/models/fetchSpecs/mapLearnerLanguageFetchSpecs.js";

export const meaningFetchSpecs = () => ({
    id: {type: "db-column"},
    text: {type: "db-column"},
    learnersCount: {type: "formula"},
    addedOn: {type: "db-column"},
    attribution: {type: "db-column"},
    vocab: {type: "relation", populate: "vocab", entityFetchSpecs: vocabFetchSpecs, relationType: "to-one"},
    addedBy: {type: "relation", populate: "addedBy", entityFetchSpecs: profileFetchSpecs, relationType: "to-one"},
    language: {type: "relation", populate: "language", entityFetchSpecs: languageFetchSpecs, relationType: "to-one"},
    attributionSource: {type: "relation", populate: "attributionSource", entityFetchSpecs: attributionSourceFetchSpecs, relationType: "to-one"},
    vocabVariant: {type: "relation", populate: "vocabVariant", entityFetchSpecs: vocabVariantFetchSpecs, relationType: "to-one"},
}) as const satisfies EntityFetchSpecs<Meaning>

export type MeaningFetchSpecsType = ReturnType<typeof meaningFetchSpecs>;