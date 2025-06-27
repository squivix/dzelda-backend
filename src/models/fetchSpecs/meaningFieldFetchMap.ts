import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {vocabFieldFetchMap} from "@/src/models/fetchSpecs/vocabFieldFetchMap.js";
import {profileFieldFieldFetchMap} from "@/src/models/fetchSpecs/profileFieldFieldFetchMap.js";
import {languageFieldFetchMap} from "@/src/models/fetchSpecs/languageFieldFetchMap.js";
import {attributionSourceFieldFetchMap} from "@/src/models/fetchSpecs/attributionSourceFieldFetchMap.js";
import {vocabVariantFieldFetchMap} from "@/src/models/fetchSpecs/vocabVariantFieldFetchMap.js";

export const meaningFieldFetchMap: FieldFetchSpecsMap<Meaning> = {
    id: {type: "db-column"},
    text: {type: "db-column"},
    learnersCount: {type: "formula"},
    addedOn: {type: "db-column"},
    attribution: {type: "db-column"},
    vocab: {type: "relation", populate: "vocab", fieldFetchSpecsMap: vocabFieldFetchMap, relationType: "to-one"},
    addedBy: {type: "relation", populate: "addedBy", fieldFetchSpecsMap: profileFieldFieldFetchMap, relationType: "to-one"},
    language: {type: "relation", populate: "language", fieldFetchSpecsMap: languageFieldFetchMap, relationType: "to-one"},
    attributionSource: {type: "relation", populate: "attributionSource", fieldFetchSpecsMap: attributionSourceFieldFetchMap, relationType: "to-one"},
    vocabVariant: {type: "relation", populate: "vocabVariant", fieldFetchSpecsMap: vocabVariantFieldFetchMap, relationType: "to-one"}
}