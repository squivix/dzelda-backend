import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class TTSVoiceSerializer extends CustomSerializer<TTSVoice> {
    static readonly view: ViewDescription = {
        fields: ["id", "code", "name", "gender", "provider", "accentCountryCode", "isDefault",],
        relations: {language: {fields: ["code"]}}
    }

    serialize(ttsVoice: TTSVoice, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: ttsVoice.id,
            code: ttsVoice.code,
            name: ttsVoice.name,
            gender: ttsVoice.gender,
            provider: ttsVoice.provider,
            accentCountryCode: ttsVoice.accentCountryCode,
            isDefault: ttsVoice.isDefault,

            language: ttsVoice.language.code,
        }, assertNoUndefined);
    }
}

export const ttsVoiceSerializer = new TTSVoiceSerializer();
