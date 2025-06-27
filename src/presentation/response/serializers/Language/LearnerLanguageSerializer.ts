import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {TranslationLanguageSerializer, translationLanguageSerializer} from "@/src/presentation/response/serializers/TranslationLanguage/TranslationLanguageSerializer.js";
import {TTSVoiceSerializer, ttsVoiceSerializer} from "@/src/presentation/response/serializers/TTSVoice/TtsVoiceSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class LearnerLanguageSerializer extends CustomSerializer<MapLearnerLanguage> {
    static readonly view: ViewDescription = {
        fields: ["startedLearningOn", "lastOpened"],
        relations: {
            language: {
                fields: ["id", "code", "name", "greeting", "flag", "flagCircular", "flagEmoji", "color", "levelThresholds", "learnersCount",]
            },
            preferredTtsVoice: TTSVoiceSerializer.view,
            preferredTranslationLanguages: TranslationLanguageSerializer.view
        }
    }

    serialize(mapping: MapLearnerLanguage, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: mapping.language.id,
            code: mapping.language.code,
            name: mapping.language.name,
            greeting: mapping.language.greeting,
            flag: mapping.language.flag,
            flagCircular: mapping.language.flagCircular,
            flagEmoji: mapping.language.flagEmoji,
            color: mapping.language.color,
            levelThresholds: mapping.language.levelThresholds,
            learnersCount: Number(mapping?.language?.learnersCount),
            isRtl: mapping.language.isRtl,

            startedLearningOn: mapping.startedLearningOn.toISOString(),
            lastOpened: mapping.lastOpened.toISOString(),

            preferredTtsVoice: mapping.preferredTtsVoice ? ttsVoiceSerializer.serialize(mapping.preferredTtsVoice, {assertNoUndefined}) : null,
            preferredTranslationLanguages: translationLanguageSerializer.serializeList(mapping.preferredTranslationLanguages.getItems().map(m => m.translationLanguage), {assertNoUndefined}),
        }, assertNoUndefined);
    }
}

export const learnerLanguageSerializer = new LearnerLanguageSerializer();
