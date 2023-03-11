import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {LearnerLanguageSchema} from "@/src/presentation/response/interfaces/mappings/LearnerLanguageSchema.js";

export class LearnerLanguageSerializer extends CustomEntitySerializer<Language | MapLearnerLanguage, LearnerLanguageSchema> {
    definition(mapping: MapLearnerLanguage): CustomCallbackObject<Partial<LearnerLanguageSchema>> {
        return {
            id: () => mapping.language.id,
            code: () => mapping.language.code,
            name: () => mapping.language.name,
            greeting: () => mapping.language.greeting,
            flag: () => mapping.language.flag,
            flagCircular: () => mapping.language.flagCircular,
            flagEmoji: () => mapping.language.flagEmoji,
            isSupported: () => mapping.language.isSupported,
            levelThresholds: () => mapping.language.levelThresholds,
            learnersCount: () => Number(mapping?.language?.learnersCount),
            addedOn: () => mapping.addedOn.toISOString(),
            lastOpened: () => mapping.lastOpened.toISOString(),
        };
    }

}

export const learnerLanguageSerializer = new LearnerLanguageSerializer();
