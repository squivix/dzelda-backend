import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {LearnerLanguageSchema, TranslationLanguageSchema, TTSVoiceSchema} from "dzelda-common";
import {ttsVoiceSerializer} from "@/src/presentation/response/serializers/entities/TTSVoiceSerializer.js";
import {translationLanguageSerializer} from "@/src/presentation/response/serializers/entities/TranslationLanguageSerializer.js";

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
            color: () => mapping.language.color,
            levelThresholds: () => mapping.language.levelThresholds,
            learnersCount: () => Number(mapping?.language?.learnersCount),
            startedLearningOn: () => mapping.startedLearningOn.toISOString(),
            lastOpened: () => mapping.lastOpened.toISOString(),
            preferredTtsVoice: () => mapping.preferredTtsVoice ? ttsVoiceSerializer.serialize(mapping.preferredTtsVoice) as TTSVoiceSchema : null,
            preferredTranslationLanguages: () => translationLanguageSerializer.serializeList(mapping.preferredTranslationLanguages.getItems().map(m => m.translationLanguage)) as TranslationLanguageSchema[]
        };
    }

}

export const learnerLanguageSerializer = new LearnerLanguageSerializer();
