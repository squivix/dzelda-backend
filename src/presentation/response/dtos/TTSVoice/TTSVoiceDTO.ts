import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";

class TTSVoiceDTO extends CustomDTO<TTSVoice> {
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
        }
    }
}

export const ttsVoiceDTO = new TTSVoiceDTO();