import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {ttsVoiceFieldFetchMap} from "@/src/models/fetchSpecs/ttsVoiceFieldFetchMap.js";
import {vocabFieldFetchMap} from "@/src/models/fetchSpecs/vocabFieldFetchMap.js";
import {vocabVariantFieldFetchMap} from "@/src/models/fetchSpecs/vocabVariantFieldFetchMap.js";


export const ttsPronunciationFieldFetchMap: FieldFetchSpecsMap<TTSPronunciation> = {
    id: {type: "db-column"},
    url: {type: "db-column"},
    addedOn: {type: "db-column"},
    voice: {type: "relation", populate: "voice", getFieldFetchSpecsMap: () => ttsVoiceFieldFetchMap, relationType: "to-one"},
    vocab: {type: "relation", populate: "vocab", getFieldFetchSpecsMap: () => vocabFieldFetchMap, relationType: "to-one"},
    vocabVariant: {type: "relation", populate: "vocabVariant", getFieldFetchSpecsMap: () => vocabVariantFieldFetchMap, relationType: "to-one"},
}