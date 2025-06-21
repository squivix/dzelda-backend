import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {VocabLevel} from "dzelda-common";
import {vocabTagDTO} from "@/src/presentation/response/dtos/VocabTag/VocabTagDTO.js";
import {vocabVariantDTO} from "@/src/presentation/response/dtos/VocabVariant/VocabVariantDTO.js";


class LearnerVocabForTextDTO extends CustomDTO<Vocab | MapLearnerVocab> {

    serialize(vocabOrMapping: Vocab | MapLearnerVocab): any {
        const isMapping = vocabOrMapping instanceof MapLearnerVocab;
        const internalVocab = isMapping ? vocabOrMapping.vocab : vocabOrMapping;

        return {
            id: internalVocab.id,
            text: internalVocab.text,
            isPhrase: internalVocab.isPhrase,
            language: internalVocab.language.code,
            learnersCount: Number(internalVocab.learnersCount),
            ttsPronunciationUrl: internalVocab.ttsPronunciations.getItems().pop()?.url ?? null,
            tags: vocabTagDTO.serializeList(internalVocab.tags.getItems()),
            rootForms: internalVocab.rootForms.getItems().map(v => v.text),
            variants: vocabVariantDTO.serializeList(internalVocab.vocabVariants.getItems()),

            // mapping fields
            level: isMapping ? vocabOrMapping.level : VocabLevel.NEW,
            notes: isMapping ? vocabOrMapping.notes : null,
        };
    }
}

export const learnerVocabForTextDTO = new LearnerVocabForTextDTO();