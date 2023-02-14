import {Language} from "@/src/models/entities/Language.js";
import {LanguageOnlySchema, LanguageSchema, LanguageWithMappingSchema} from "@/src/schemas/response/interfaces/LanguageSchema.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/schemas/response/serializers/CustomEntitySerializer.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";

export class LanguageSerializer extends CustomEntitySerializer<Language | MapLearnerLanguage, LanguageSchema> {
    definition(languageOrMapping: Language | MapLearnerLanguage): CustomCallbackObject<Partial<LanguageSchema>> {
        if (languageOrMapping instanceof Language) {
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
                // TODO see if learnersCount could be done with populate
                learnersCount: () => Number(languageOrMapping.learnersCount ?? languageOrMapping?.learners?.count())
            };
        } else {
            return {
                id: () => languageOrMapping.language.id,
                code: () => languageOrMapping.language.code,
                name: () => languageOrMapping.language.name,
                greeting: () => languageOrMapping.language.greeting,
                flag: () => languageOrMapping.language.flag,
                flagCircular: () => languageOrMapping.language.flagCircular,
                flagEmoji: () => languageOrMapping.language.flagEmoji,
                isSupported: () => languageOrMapping.language.isSupported,
                levelThresholds: () => languageOrMapping.language.levelThresholds,
                learnersCount: () => Number(languageOrMapping.language.learnersCount ?? languageOrMapping.language?.learners?.count()),
                addedOn: () => languageOrMapping.addedOn.toISOString(),
                lastOpened: () => languageOrMapping.lastOpened.toISOString(),
            };
        }
    }

    serialize(entity: Language | MapLearnerLanguage, {ignore}: { ignore: (keyof LanguageOnlySchema | keyof LanguageWithMappingSchema)[] } = {ignore: []}): Partial<LanguageSchema> {
        return super.serialize(entity, {ignore: ignore as (keyof LanguageSchema)[]});
    }
}

export const languageSerializer = new LanguageSerializer();
