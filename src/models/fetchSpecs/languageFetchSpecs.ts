import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {Language} from "@/src/models/entities/Language.js";

export const languageFetchSpecs = () => ({
    id: {type: "db-column"},
    code: {type: "db-column"},
    name: {type: "db-column"},
    greeting: {type: "db-column"},
    secondSpeakersCount: {type: "db-column"},
    flag: {type: "db-column"},
    flagCircular: {type: "db-column"},
    flagEmoji: {type: "db-column"},
    color: {type: "db-column"},
    isRtl: {type: "db-column"},
    isAbjad: {type: "db-column"},
    levelThresholds: {type: "db-column"},
    learnersCount: {type: "formula"},
}) as const satisfies EntityFetchSpecs<Language>

export type LanguageFetchSpecsType = ReturnType<typeof languageFetchSpecs>;