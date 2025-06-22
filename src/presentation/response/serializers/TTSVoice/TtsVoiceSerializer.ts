import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";

class TTSVoiceSerializer extends CustomSerializer<TTSVoice> {
    serialize(ttsVoice: TTSVoice): any {
        return {
            id: ttsVoice.id,
            code: ttsVoice.code,
            name: ttsVoice.name,
            gender: ttsVoice.gender,
            provider: ttsVoice.provider,
            accentCountryCode: ttsVoice.accentCountryCode,
            language: ttsVoice.language.code,
            isDefault: ttsVoice.isDefault,
        };
    }
}

export const ttsVoiceSerializer = new TTSVoiceSerializer();