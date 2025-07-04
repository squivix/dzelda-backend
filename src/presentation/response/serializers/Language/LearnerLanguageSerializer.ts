import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {translationLanguageSerializer} from "@/src/presentation/response/serializers/TranslationLanguage/TranslationLanguageSerializer.js";
import {ttsVoiceSerializer} from "@/src/presentation/response/serializers/TTSVoice/TtsVoiceSerializer.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {MapLearnerLanguageFetchSpecsType} from "@/src/models/fetchSpecs/mapLearnerLanguageFetchSpecs.js";

class LearnerLanguageSerializer extends CustomSerializer<MapLearnerLanguage> {
    readonly view: ViewDescriptionFromSpec<MapLearnerLanguage, MapLearnerLanguageFetchSpecsType> = {
        fields: ["startedLearningOn", "lastOpened"],
        relations: {
            language: {
                fields: ["id", "code", "name", "greeting", "isRtl", "flag", "flagCircular", "flagEmoji", "color", "levelThresholds", "learnersCount",]
            },
            preferredTtsVoice: ttsVoiceSerializer.view,
            preferredTranslationLanguageEntries: {
                fields: ["precedenceOrder"],
                relations: {translationLanguage: translationLanguageSerializer.view}
            }
        }
    }

    serialize(mapping: MapLearnerLanguage, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: mapping.language.id,
            code: mapping.language.code,
            name: mapping.language.name,
            greeting: mapping.language.greeting,
            isRtl: mapping.language.isRtl,
            flag: mapping.language.flag,
            flagCircular: mapping.language.flagCircular,
            flagEmoji: mapping.language.flagEmoji,
            color: mapping.language.color,
            levelThresholds: mapping.language.levelThresholds,
            learnersCount: Number(mapping?.language?.learnersCount),

            startedLearningOn: mapping.startedLearningOn.toISOString(),
            lastOpened: mapping.lastOpened.toISOString(),

            preferredTtsVoice: mapping.preferredTtsVoice ? ttsVoiceSerializer.serialize(mapping.preferredTtsVoice, {assertNoUndefined}) : null,
            preferredTranslationLanguages: translationLanguageSerializer.serializeList(mapping.preferredTranslationLanguageEntries.getItems().map(m => m.translationLanguage), {assertNoUndefined}),
        }, assertNoUndefined);
    }
}

export const learnerLanguageSerializer = new LearnerLanguageSerializer();
