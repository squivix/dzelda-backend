import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {PreferredTranslationLanguageEntry} from "@/src/models/entities/PreferredTranslationLanguageEntry.js";
import {translationLanguageFieldFetchMap} from "@/src/models/fetchSpecs/translationLanguageFieldFetchMap.js";
import {mapLearnerLanguageFieldFetchMap} from "@/src/models/fetchSpecs/mapLearnerLanguageFieldFetchMap.js";

export const preferredTranslationLanguageEntryFieldFetchMap: FieldFetchSpecsMap<PreferredTranslationLanguageEntry> = {
    translationLanguage: {type: "relation", populate: "translationLanguage", getFieldFetchSpecsMap: () => translationLanguageFieldFetchMap, relationType: "to-one"},
    learnerLanguageMapping: {type: "relation", populate: "learnerLanguageMapping", getFieldFetchSpecsMap: () => mapLearnerLanguageFieldFetchMap, relationType: "to-one"},
    precedenceOrder: {type: "db-column"}
}