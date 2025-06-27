import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Language} from "@/src/models/entities/Language.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class LanguageSerializer extends CustomSerializer<Language> {
    serialize(language: Language, {assertNoUndefined = true} = {}): any {
        const pojo = {
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
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const languageSerializer = new LanguageSerializer();