import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {translationLanguageDTO} from "@/src/presentation/response/dtos/TranslationLanguage/TranslationLanguageDTO.js";
import {ttsVoiceDTO} from "@/src/presentation/response/dtos/TTSVoice/TTSVoiceDTO.js";

class LearnerLanguageDTO extends CustomDTO<MapLearnerLanguage> {
    serialize(mapping: MapLearnerLanguage): any {
        return {
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
            preferredTtsVoice: mapping.preferredTtsVoice ? ttsVoiceDTO.serialize(mapping.preferredTtsVoice) : null,
            preferredTranslationLanguages: translationLanguageDTO.serializeList(mapping.preferredTranslationLanguages.getItems().map(m => m.translationLanguage)),
            isRtl: mapping.language.isRtl,
        }
    }
}

export const learnerLanguageDTO = new LearnerLanguageDTO();