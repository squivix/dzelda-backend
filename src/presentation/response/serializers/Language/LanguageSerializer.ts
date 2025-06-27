import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Language} from "@/src/models/entities/Language.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

export class LanguageSerializer extends CustomSerializer<Language> {
    static readonly view: ViewDescription = {
        fields: ["id", "code", "name", "greeting", "isRtl", "flag", "flagCircular", "flagEmoji", "color", "levelThresholds", "learnersCount",]
    }

    serialize(language: Language, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: language.id,
            code: language.code,
            name: language.name,
            greeting: language.greeting,
            isRtl: language.isRtl,
            flag: language.flag,
            flagCircular: language.flagCircular,
            flagEmoji: language.flagEmoji,
            color: language.color,
            levelThresholds: language.levelThresholds,
            learnersCount: Number(language.learnersCount),
        }, assertNoUndefined);
    }
}

export const languageSerializer = new LanguageSerializer();
