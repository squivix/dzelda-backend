import {Language} from "@/src/models/entities/Language.js";
import {LanguageListSchema} from "@/src/schemas/response/interfaces/LanguageListSchema.js";
import {LanguageDetailsSchema} from "@/src/schemas/response/interfaces/LanguageDetailsSchema.js";
import {CustomCallbackObject, ListDetailSerializer} from "@/src/schemas/response/serializers/ListDetailSerializer.js";

class LanguageSerializer extends ListDetailSerializer<Language, LanguageListSchema, LanguageDetailsSchema> {

    listDefinition(language: Language): CustomCallbackObject<LanguageListSchema> {
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
            learnersCount: () => Number(language.learnersCount ?? language?.learners?.count())
        }
    }

    detailDefinition(language: Language): CustomCallbackObject<LanguageDetailsSchema> {
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
            learnersCount: () => Number(language.learnersCount ?? language?.learners?.count())
        }
    }
}

export const languageSerializer = new LanguageSerializer()
