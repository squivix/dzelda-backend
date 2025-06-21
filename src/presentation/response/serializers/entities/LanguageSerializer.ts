import {Language} from "@/src/models/entities/Language.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {LanguageSchema} from "dzelda-common";

export class LanguageSerializer extends CustomEntitySerializer<Language, LanguageSchema> {
    definition(language: Language): CustomCallbackObject<Partial<LanguageSchema>> {
        return {
            id: () => language.id,
            code: () => language.code,
            name: () => language.name,
            greeting: () => language.greeting,
            isRtl: () => language.isRtl,
            flag: () => language.flag,
            flagCircular: () => language.flagCircular,
            flagEmoji: () => language.flagEmoji,
            color: () => language.color,
            levelThresholds: () => language.levelThresholds,
            learnersCount: () => Number(language.learnersCount),
        };
    }
}

export const languageSerializer = new LanguageSerializer();
