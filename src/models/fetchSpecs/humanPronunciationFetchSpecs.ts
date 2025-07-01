import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";
import {languageFetchSpecs} from "@/src/models/fetchSpecs/languageFetchSpecs.js";
import {attributionSourceFetchSpecs} from "@/src/models/fetchSpecs/attributionSourceFetchSpecs.js";

export const humanPronunciationFetchSpecs = () => ({
    id: {type: "db-column"},
    url: {type: "db-column"},
    text: {type: "db-column"},
    parsedText: {type: "db-column"},
    speakerCountryCode: {type: "db-column"},
    speakerRegion: {type: "db-column"},
    attribution: {type: "db-column"},
    language: {type: "relation", populate: "language", relationType: "to-one", entityFetchSpecs: languageFetchSpecs},
    attributionSource: {type: "relation", populate: "attributionSource", relationType: "to-one", entityFetchSpecs: attributionSourceFetchSpecs},
}) as const satisfies EntityFetchSpecs<HumanPronunciation>

export type HumanPronunciationFetchSpecsType = ReturnType<typeof humanPronunciationFetchSpecs>;