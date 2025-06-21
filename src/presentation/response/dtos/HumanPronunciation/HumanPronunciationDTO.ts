import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";
import {attributionSourceDTO} from "@/src/presentation/response/dtos/AttributionSource/AttributionSourceDTO.js";

class HumanPronunciationDTO extends CustomDTO<HumanPronunciation> {
    serialize(humanPronunciation: HumanPronunciation): any {
        return {
            id: humanPronunciation.id,
            url: humanPronunciation.url,
            text: humanPronunciation.text,
            parsedText: humanPronunciation.parsedText,
            language: humanPronunciation.language.code,
            speakerCountryCode: humanPronunciation.speakerCountryCode,
            speakerRegion: humanPronunciation.speakerRegion,
            attributionSource: humanPronunciation.attributionSource ? attributionSourceDTO.serialize(humanPronunciation.attributionSource) : null,
            attribution: humanPronunciation.attribution,
        }
    }
}

export const humanPronunciationDTO = new HumanPronunciationDTO();