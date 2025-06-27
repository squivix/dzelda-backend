import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class TTSVoiceSerializer extends CustomSerializer<TTSVoice> {
    serialize(ttsVoice: TTSVoice, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: ttsVoice.id,
            code: ttsVoice.code,
            name: ttsVoice.name,
            gender: ttsVoice.gender,
            provider: ttsVoice.provider,
            accentCountryCode: ttsVoice.accentCountryCode,
            language: ttsVoice.language.code,
            isDefault: ttsVoice.isDefault,
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const ttsVoiceSerializer = new TTSVoiceSerializer();