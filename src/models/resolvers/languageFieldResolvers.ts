import {FieldResolvers} from "@/src/models/viewResolver.js";
import {Language} from "@/src/models/entities/Language.js";

export const languageFieldResolvers: FieldResolvers<Language> = {
    id: {type: 'db'},
    code: {type: 'db'},
    name: {type: 'db'},
    greeting: {type: 'db'},
    secondSpeakersCount: {type: 'db'},
    flag: {type: 'db'},
    flagCircular: {type: 'db'},
    flagEmoji: {type: 'db'},
    color: {type: 'db'},
    isRtl: {type: 'db'},
    isAbjad: {type: 'db'},
    levelThresholds: {type: 'db'},
    learnersCount: {type: 'formula'},
};
