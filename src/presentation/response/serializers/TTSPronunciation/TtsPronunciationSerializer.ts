import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {ttsVoiceSerializer} from "@/src/presentation/response/serializers/TTSVoice/TtsVoiceSerializer.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class TTSPronunciationSerializer extends CustomSerializer<TTSPronunciation> {
    serialize(ttsPronunciation: TTSPronunciation, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: ttsPronunciation.id,
            url: ttsPronunciation.url,
            addedOn: ttsPronunciation.addedOn.toISOString(),
            voice: ttsVoiceSerializer.serialize(ttsPronunciation.voice),
            vocabId: ttsPronunciation.vocab?.id ?? null,
            variantId: ttsPronunciation.vocabVariant?.id ?? null,
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const ttsPronunciationSerializer = new TTSPronunciationSerializer();