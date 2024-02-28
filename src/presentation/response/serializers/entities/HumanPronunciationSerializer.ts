import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {HumanPronunciationSchema} from "dzelda-common";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";
import {attributionSourceSerializer} from "@/src/presentation/response/serializers/entities/AttributionSourceSerializer.js";


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
            attributionSource: () => humanPronunciation.attributionSource ? attributionSourceSerializer.serialize(humanPronunciation.attributionSource) : null,
            attribution: () => humanPronunciation.attribution,
        };
    }

}

export const humanPronunciationSerializer = new HumanPronunciationSerializer();
