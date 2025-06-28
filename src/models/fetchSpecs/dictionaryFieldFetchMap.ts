import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {languageFieldFetchMap} from "@/src/models/fetchSpecs/languageFieldFetchMap.js";

export const dictionaryFieldFetchMap: FieldFetchSpecsMap<Dictionary> = {
    id: {type: "db-column"},
    name: {type: "db-column"},
    lookupLink: {type: "db-column"},
    dictionaryLink: {type: "db-column"},
    isPronunciation: {type: "db-column"},
    language: {type: "relation", populate: "language", relationType: "to-one", getFieldFetchSpecsMap: () => languageFieldFetchMap},
}