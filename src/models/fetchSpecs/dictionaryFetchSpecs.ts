import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {languageFetchSpecs} from "@/src/models/fetchSpecs/languageFetchSpecs.js";

export const dictionaryFetchSpecs = () => ({
    id: {type: "db-column"},
    name: {type: "db-column"},
    lookupLink: {type: "db-column"},
    dictionaryLink: {type: "db-column"},
    isPronunciation: {type: "db-column"},
    language: {type: "relation", populate: "language", relationType: "to-one", entityFetchSpecs: languageFetchSpecs},
}) as const satisfies EntityFetchSpecs<Dictionary>

export type DictionaryFetchSpecsType = ReturnType<typeof dictionaryFetchSpecs>;