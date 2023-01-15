import {Language} from "@/src/models/entities/Language.js";
import {CustomEntitySerializer, SerializationMode} from "@/src/schemas/serializers/EntitySerializer.js";
import {LanguageListSchema} from "@/src/schemas/interfaces/LanguageListSchema.js";
import {LanguageDetailsSchema} from "@/src/schemas/interfaces/LanguageDetailsSchema.js";

class LanguageSerializer extends CustomEntitySerializer<Language, LanguageListSchema | LanguageDetailsSchema> {
    serialize(language: Language, {
        mode,
        hiddenFields
    }: { mode?: SerializationMode; hiddenFields?: (keyof LanguageListSchema | LanguageDetailsSchema)[] } = {}): LanguageListSchema | LanguageDetailsSchema {
        return {
            id: language.id,
            code: language.code,
            name: language.name,
            greeting: language.greeting,
            flag: language.flag,
            flagCircular: language.flagCircular,
            flagEmoji: language.flagEmoji,
            isSupported: language.isSupported,
            levelThresholds: language.levelThresholds,
            learnersCount: Number(language.learnersCount)
        }
    }
}

export const languageSerializer = new LanguageSerializer()
