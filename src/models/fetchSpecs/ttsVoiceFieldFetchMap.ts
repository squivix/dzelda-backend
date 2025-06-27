import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import {languageFieldFetchMap} from "@/src/models/fetchSpecs/languageFieldFetchMap.js";

export const ttsVoiceFieldFetchMap: FieldFetchSpecsMap<TTSVoice> = {
    id: {type: 'db-column'},
    code: {type: 'db-column'},
    name: {type: 'db-column'},
    gender: {type: 'db-column'},
    provider: {type: 'db-column'},
    accentCountryCode: {type: 'db-column'},
    isDefault: {type: 'db-column'},
    language: {type: "relation", populate: "language", fieldFetchSpecsMap: languageFieldFetchMap, relationType: "to-one"}
}