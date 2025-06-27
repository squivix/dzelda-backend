import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {ttsVoiceSerializer} from "@/src/presentation/response/serializers/TTSVoice/TtsVoiceSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class TTSPronunciationSerializer extends CustomSerializer<TTSPronunciation> {
    static readonly view: ViewDescription = {
        fields: ["id", "url", "addedOn", "vocab", "vocabVariant"],
        relations: {
            voice: {
                fields: ["id", "code", "name", "gender", "provider", "accentCountryCode", "isDefault",],
                relations: {language: {fields: ["code"]}}
            },
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
