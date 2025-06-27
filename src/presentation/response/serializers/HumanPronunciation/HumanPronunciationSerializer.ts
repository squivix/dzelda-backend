import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";
import {attributionSourceSerializer} from "@/src/presentation/response/serializers/AttributionSource/AttributionSourceSerializer.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class HumanPronunciationSerializer extends CustomSerializer<HumanPronunciation> {
    serialize(humanPronunciation: HumanPronunciation, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: humanPronunciation.id,
            url: humanPronunciation.url,
            text: humanPronunciation.text,
            parsedText: humanPronunciation.parsedText,
            language: humanPronunciation.language.code,
            speakerCountryCode: humanPronunciation.speakerCountryCode,
            speakerRegion: humanPronunciation.speakerRegion,
            attributionSource: humanPronunciation.attributionSource ? attributionSourceSerializer.serialize(humanPronunciation.attributionSource, {assertNoUndefined}) : null,
            attribution: humanPronunciation.attribution,
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const humanPronunciationSerializer = new HumanPronunciationSerializer();