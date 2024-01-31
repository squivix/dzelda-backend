import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {TTSPronunciationSchema, TTSVoiceSchema} from "dzelda-common";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {ttsVoiceSerializer} from "@/src/presentation/response/serializers/entities/TTSVoiceSerializer.js";


class TTSPronunciationSerializer extends CustomEntitySerializer<TTSPronunciation, TTSPronunciationSchema> {

    definition(ttsPronunciation: TTSPronunciation): CustomCallbackObject<Partial<TTSPronunciationSchema>> {
        return {
            id: () => ttsPronunciation.id,
            url: () => ttsPronunciation.url,
            addedOn: () => ttsPronunciation.addedOn.toISOString(),
            voice: () => ttsVoiceSerializer.serialize(ttsPronunciation.voice) as TTSVoiceSchema,
        };
    }

}

export const ttsPronunciationSerializer = new TTSPronunciationSerializer();
