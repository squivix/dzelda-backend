import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {ttsVoiceDTO} from "@/src/presentation/response/dtos/TTSVoice/TTSVoiceDTO.js";

class TTSPronunciationDTO extends CustomDTO<TTSPronunciation> {
    serialize(ttsPronunciation: TTSPronunciation): any {
        return {
            id: ttsPronunciation.id,
            url: ttsPronunciation.url,
            addedOn: ttsPronunciation.addedOn.toISOString(),
            voice: ttsVoiceDTO.serialize(ttsPronunciation.voice),
            vocabId: ttsPronunciation.vocab?.id ?? null,
            variantId: ttsPronunciation.vocabVariant?.id ?? null,
        };
    }
}

export const ttsPronunciationDTO = new TTSPronunciationDTO();