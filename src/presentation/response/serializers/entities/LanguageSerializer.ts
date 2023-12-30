import {Language} from "@/src/models/entities/Language.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {LanguageSchema} from "dzelda-common";

export class LanguageSerializer extends CustomEntitySerializer<Language, LanguageSchema> {
    definition(languageOrMapping: Language): CustomCallbackObject<Partial<LanguageSchema>> {
        return {
            id: () => languageOrMapping.id,
            code: () => languageOrMapping.code,
            name: () => languageOrMapping.name,
            greeting: () => languageOrMapping.greeting,
            flag: () => languageOrMapping.flag,
            flagCircular: () => languageOrMapping.flagCircular,
            flagEmoji: () => languageOrMapping.flagEmoji,
            isSupported: () => languageOrMapping.isSupported,
            levelThresholds: () => languageOrMapping.levelThresholds,
            learnersCount: () => Number(languageOrMapping?.learnersCount)
        };
    }
}

export const languageSerializer = new LanguageSerializer();
