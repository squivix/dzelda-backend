import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {ttsVoiceFetchSpecs} from "@/src/models/fetchSpecs/ttsVoiceFetchSpecs.js";
import {vocabFetchSpecs} from "@/src/models/fetchSpecs/vocabFetchSpecs.js";
import {vocabVariantFetchSpecs} from "@/src/models/fetchSpecs/vocabVariantFetchSpecs.js";


export const ttsPronunciationFetchSpecs = () => ({
    id: {type: "db-column"},
    url: {type: "db-column"},
    addedOn: {type: "db-column"},
    voice: {type: "relation", populate: "voice", entityFetchSpecs: ttsVoiceFetchSpecs, relationType: "to-one"},
    vocab: {type: "relation", populate: "vocab", entityFetchSpecs: vocabFetchSpecs, relationType: "to-one"},
    vocabVariant: {type: "relation", populate: "vocabVariant", entityFetchSpecs: vocabVariantFetchSpecs, relationType: "to-one"},
}) as const satisfies EntityFetchSpecs<TTSPronunciation>

export type TTSPronunciationFetchSpecsType = ReturnType<typeof ttsPronunciationFetchSpecs>;