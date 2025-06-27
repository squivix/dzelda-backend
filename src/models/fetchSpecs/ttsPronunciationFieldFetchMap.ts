import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {ttsVoiceFieldFetchMap} from "@/src/models/fetchSpecs/ttsVoiceFieldFetchMap.js";
import {vocabFieldFetchMap} from "@/src/models/fetchSpecs/vocabFieldFetchMap.js";
import {vocabVariantFieldFetchMap} from "@/src/models/fetchSpecs/vocabVariantFieldFetchMap.js";


export const ttsPronunciationFieldFetchMap: FieldFetchSpecsMap<TTSPronunciation> = {
    id: {type: "db-column"},
    url: {type: "db-column"},
    addedOn: {type: "db-column"},
    voice: {type: "relation", populate: "voice", fieldFetchSpecsMap: ttsVoiceFieldFetchMap, relationType: "to-one"},
    vocab: {type: "relation", populate: "vocab", fieldFetchSpecsMap: vocabFieldFetchMap, relationType: "to-one"},
    vocabVariant: {type: "relation", populate: "vocabVariant", fieldFetchSpecsMap: vocabVariantFieldFetchMap, relationType: "to-one"},
}