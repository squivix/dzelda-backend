import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Language} from "@/src/models/entities/Language.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {LanguageFetchSpecsType} from "@/src/models/fetchSpecs/languageFetchSpecs.js";

class LanguageSerializer extends CustomSerializer<Language> {
    readonly view: ViewDescriptionFromSpec<Language, LanguageFetchSpecsType> = {
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
