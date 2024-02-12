import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {TTSVoiceSchema} from "dzelda-common";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";


class TTSVoiceSerializer extends CustomEntitySerializer<TTSVoice, TTSVoiceSchema> {

    definition(ttsVoice: TTSVoice): CustomCallbackObject<Partial<TTSVoiceSchema>> {
        return {
            id: () => ttsVoice.id,
            code: () => ttsVoice.code,
            name: () => ttsVoice.name,
            gender: () => ttsVoice.gender,
            provider: () => ttsVoice.provider,
            accentCountryCode: () => ttsVoice.accentCountryCode,
            language: () => ttsVoice.language.code,
            isDefault: () => ttsVoice.isDefault,
        };
    }

}

export const ttsVoiceSerializer = new TTSVoiceSerializer();
