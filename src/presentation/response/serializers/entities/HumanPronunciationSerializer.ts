import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {HumanPronunciationSchema, VocabSchema} from "dzelda-common";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";
import {vocabSerializer} from "@/src/presentation/response/serializers/entities/VocabSerializer.js";


class HumanPronunciationSerializer extends CustomEntitySerializer<HumanPronunciation, HumanPronunciationSchema> {

    definition(humanPronunciation: HumanPronunciation): CustomCallbackObject<Partial<HumanPronunciationSchema>> {
        return {
            id: () => humanPronunciation.id,
            url: () => humanPronunciation.url,
            accent: () => humanPronunciation.accent,
            source: () => humanPronunciation.source,
            attributionLogo: () => humanPronunciation.attributionLogo,
            attributionMarkdownText: () => humanPronunciation.attributionMarkdownText,
            vocab: () => vocabSerializer.serialize(humanPronunciation.vocab) as VocabSchema
        };
    }

}

export const humanPronunciationSerializer = new HumanPronunciationSerializer();
