import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {HumanPronunciationSchema} from "dzelda-common";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";


class HumanPronunciationSerializer extends CustomEntitySerializer<HumanPronunciation, HumanPronunciationSchema> {

    definition(humanPronunciation: HumanPronunciation): CustomCallbackObject<Partial<HumanPronunciationSchema>> {
        return {
            id: () => humanPronunciation.id,
            url: () => humanPronunciation.url,
            text: () => humanPronunciation.text,
            parsedText: () => humanPronunciation.parsedText,
            language: () => humanPronunciation.language.code,
            speakerCountryCode: () => humanPronunciation.speakerCountryCode,
            speakerRegion: () => humanPronunciation.speakerRegion,
            attribution: () => humanPronunciation.attribution,
        };
    }

}

export const humanPronunciationSerializer = new HumanPronunciationSerializer();
