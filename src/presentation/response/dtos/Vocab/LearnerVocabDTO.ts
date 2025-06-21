import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {meaningSummeryDTO} from "@/src/presentation/response/dtos/Meaning/MeaningSummeryDTO.js";
import {vocabVariantDTO} from "@/src/presentation/response/dtos/VocabVariant/VocabVariantDTO.js";
import {vocabTagDTO} from "@/src/presentation/response/dtos/VocabTag/VocabTagDTO.js";

class LearnerVocabDTO extends CustomDTO<MapLearnerVocab> {
    serialize(mapping: MapLearnerVocab): any {
        return {
            id: mapping.vocab.id,
            text: mapping.vocab.text,
            isPhrase: mapping.vocab.isPhrase,
            level: mapping.level,
            notes: mapping.notes,
            language: mapping.vocab.language.code,
            learnerMeanings: meaningSummeryDTO.serializeList(mapping.vocab.learnerMeanings.getItems()),
            meanings: meaningSummeryDTO.serializeList(mapping.vocab.meanings.getItems()),
            learnersCount: Number(mapping.vocab.learnersCount),
            ttsPronunciationUrl: mapping.vocab.ttsPronunciations.getItems().pop()?.url ?? null,
            tags: vocabTagDTO.serializeList(mapping.vocab.tags.getItems()),
            rootForms: mapping.vocab.rootForms.getItems().map(v => v.text),
            variants: vocabVariantDTO.serializeList(mapping.vocab.vocabVariants.getItems())
        }
    }
}

export const learnerVocabDTO = new LearnerVocabDTO();