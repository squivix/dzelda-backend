import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";
import {attributionSourceSerializer} from "@/src/presentation/response/serializers/AttributionSource/AttributionSourceSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class HumanPronunciationSerializer extends CustomSerializer<HumanPronunciation> {
    readonly view: ViewDescription = {
        fields: ["id", "url", "text", "parsedText", "speakerCountryCode", "speakerRegion", "attribution",],
        relations: {
            language: {fields: ["code"]},
            attributionSource: attributionSourceSerializer.view
        }
    }

    serialize(humanPronunciation: HumanPronunciation, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: humanPronunciation.id,
            url: humanPronunciation.url,
            text: humanPronunciation.text,
            parsedText: humanPronunciation.parsedText,
            speakerCountryCode: humanPronunciation.speakerCountryCode,
            speakerRegion: humanPronunciation.speakerRegion,
            attribution: humanPronunciation.attribution,

            language: humanPronunciation.language.code,
            attributionSource: humanPronunciation.attributionSource ? attributionSourceSerializer.serialize(humanPronunciation.attributionSource, {assertNoUndefined}) : null,
        }, assertNoUndefined);
    }
}

export const humanPronunciationSerializer = new HumanPronunciationSerializer();
