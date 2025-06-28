import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {languageFieldFetchMap} from "@/src/models/fetchSpecs/languageFieldFetchMap.js";
import {ttsVoiceFieldFetchMap} from "@/src/models/fetchSpecs/ttsVoiceFieldFetchMap.js";
import {translationLanguageFieldFetchMap} from "@/src/models/fetchSpecs/translationLanguageFieldFetchMap.js";
import {preferredTranslationLanguageEntryFieldFetchMap} from "@/src/models/fetchSpecs/preferredTranslationLanguageEntryFieldFetchMap.js";

export const mapLearnerLanguageFieldFetchMap: FieldFetchSpecsMap<MapLearnerLanguage> = {
    startedLearningOn: {type: "db-column"},
    lastOpened: {type: "db-column"},
    language: {type: "relation", populate: "language", relationType: "to-one", getFieldFetchSpecsMap: () => languageFieldFetchMap},
    preferredTtsVoice: {type: "relation", populate: "preferredTtsVoice", relationType: "to-one", getFieldFetchSpecsMap: () => ttsVoiceFieldFetchMap},
    preferredTranslationLanguageEntries: {type: "relation", populate: "preferredTranslationLanguageEntries", relationType: "to-many", getFieldFetchSpecsMap: () => preferredTranslationLanguageEntryFieldFetchMap},

}