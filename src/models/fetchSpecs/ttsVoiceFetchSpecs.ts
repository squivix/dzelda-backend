import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import {languageFetchSpecs} from "@/src/models/fetchSpecs/languageFetchSpecs.js";

export const ttsVoiceFetchSpecs = () => ({
    id: {type: "db-column"},
    code: {type: "db-column"},
    name: {type: "db-column"},
    gender: {type: "db-column"},
    provider: {type: "db-column"},
    accentCountryCode: {type: "db-column"},
    isDefault: {type: "db-column"},
    language: {type: "relation", populate: "language", entityFetchSpecs: languageFetchSpecs, relationType: "to-one"},
}) as const satisfies EntityFetchSpecs<TTSVoice>

export type TTSVoiceFetchSpecsType = ReturnType<typeof ttsVoiceFetchSpecs>;