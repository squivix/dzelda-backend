import {Language} from "@/src/models/entities/Language.js";
import {LanguageSchema} from "@/src/schemas/response/interfaces/LanguageSchema.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/schemas/response/serializers/CustomEntitySerializer.js";

export class LanguageSerializer extends CustomEntitySerializer<Language, LanguageSchema> {
    static readonly POPULATE_FIELDS = [] as const;

    definition(language: Language): CustomCallbackObject<LanguageSchema> {
        return {
            id: () => language.id,
            code: () => language.code,
            name: () => language.name,
            greeting: () => language.greeting,
            flag: () => language.flag,
            flagCircular: () => language.flagCircular,
            flagEmoji: () => language.flagEmoji,
            isSupported: () => language.isSupported,
            levelThresholds: () => language.levelThresholds,
            // TODO see if learnersCount could be done with populate
            learnersCount: () => Number(language.learnersCount ?? language?.learners?.count())
        };
    }
}

export const languageSerializer = new LanguageSerializer();
