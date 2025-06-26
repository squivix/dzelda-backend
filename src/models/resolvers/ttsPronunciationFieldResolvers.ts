import {FieldResolvers} from "@/src/models/viewResolver.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {ttsVoiceResolvers} from "@/src/models/resolvers/ttsVoiceResolvers.js";
import {vocabFieldResolvers} from "@/src/models/resolvers/vocabFieldResolvers.js";
import {vocabVariantFieldResolvers} from "@/src/models/resolvers/vocabVariantFieldResolvers.js";


export const ttsPronunciationFieldResolvers: FieldResolvers<TTSPronunciation> = {
    id: {type: 'db'},
    url: {type: 'db'},
    addedOn: {type: 'db'},
    voice: {type: "relation", populate: "voice", resolvers: ttsVoiceResolvers},
    vocab: {type: "relation", populate: "vocab", resolvers: vocabFieldResolvers},
    vocabVariant: {type: "relation", populate: "vocabVariant", resolvers: vocabVariantFieldResolvers},
}