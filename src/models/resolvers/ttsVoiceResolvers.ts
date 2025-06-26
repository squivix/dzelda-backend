import {FieldResolvers} from "@/src/models/viewResolver.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import {languageFieldResolvers} from "@/src/models/resolvers/languageFieldResolvers.js";

export const ttsVoiceResolvers: FieldResolvers<TTSVoice> = {
    id: {type: "db"},
    code: {type: "db"},
    name: {type: "db"},
    gender: {type: "db"},
    provider: {type: "db"},
    accentCountryCode: {type: "db"},
    isDefault: {type: "db"},
    language: {type: "relation", populate: "language", resolvers: languageFieldResolvers}
}