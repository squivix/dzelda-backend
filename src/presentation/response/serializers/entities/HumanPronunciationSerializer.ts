import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {HumanPronunciationSchema} from "dzelda-common";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";


class HumanPronunciationSerializer extends CustomEntitySerializer<HumanPronunciation, HumanPronunciationSchema> {

    definition(humanPronunciation: HumanPronunciation): CustomCallbackObject<Partial<HumanPronunciationSchema>> {
        return {
            id: () => humanPronunciation.id,
            url: () => humanPronunciation.url,
            text: () => humanPronunciation.text,
            language: () => humanPronunciation.language.code,
            accent: () => humanPronunciation.accent,
            source: () => humanPronunciation.source,
            attributionLogo: () => humanPronunciation.attributionLogo,
            attributionMarkdownText: () => humanPronunciation.attributionMarkdownText,
        };
    }

}

export const humanPronunciationSerializer = new HumanPronunciationSerializer();
