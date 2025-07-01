import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {ttsVoiceSerializer} from "@/src/presentation/response/serializers/TTSVoice/TtsVoiceSerializer.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {TTSPronunciationFetchSpecsType} from "@/src/models/fetchSpecs/ttsPronunciationFetchSpecs.js";

class TTSPronunciationSerializer extends CustomSerializer<TTSPronunciation> {
    readonly view: ViewDescriptionFromSpec<TTSPronunciation, TTSPronunciationFetchSpecsType> = {
        fields: ["id", "url", "addedOn", "vocab", "vocabVariant"],
        relations: {
            voice: ttsVoiceSerializer.view
        }
    }

    serialize(ttsPronunciation: TTSPronunciation, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: ttsPronunciation.id,
            url: ttsPronunciation.url,
            addedOn: ttsPronunciation.addedOn.toISOString(),

            voice: ttsVoiceSerializer.serialize(ttsPronunciation.voice),
            vocabId: ttsPronunciation.vocab?.id ?? null,
            variantId: ttsPronunciation.vocabVariant?.id ?? null,
        }, assertNoUndefined);
    }
}

export const ttsPronunciationSerializer = new TTSPronunciationSerializer();
