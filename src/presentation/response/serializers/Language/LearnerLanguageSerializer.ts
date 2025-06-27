import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {translationLanguageSerializer} from "@/src/presentation/response/serializers/TranslationLanguage/TranslationLanguageSerializer.js";
import {ttsVoiceSerializer} from "@/src/presentation/response/serializers/TTSVoice/TtsVoiceSerializer.js";

class LearnerLanguageSerializer extends CustomSerializer<MapLearnerLanguage> {
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
            startedLearningOn: mapping.startedLearningOn.toISOString(),
            lastOpened: mapping.lastOpened.toISOString(),
            preferredTtsVoice: mapping.preferredTtsVoice ? ttsVoiceSerializer.serialize(mapping.preferredTtsVoice, {assertNoUndefined}) : null,
            preferredTranslationLanguages: translationLanguageSerializer.serializeList(mapping.preferredTranslationLanguages.getItems().map(m => m.translationLanguage), {assertNoUndefined}),
            isRtl: mapping.language.isRtl,
        }, assertNoUndefined);
    }
}

export const learnerLanguageSerializer = new LearnerLanguageSerializer();
