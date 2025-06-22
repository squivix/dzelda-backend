import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {VocabLevel} from "dzelda-common";
import {vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";


class LearnerVocabForTextSerializer extends CustomSerializer<Vocab | MapLearnerVocab> {

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
            tags: vocabTagSerializer.serializeList(internalVocab.tags.getItems()),
            rootForms: internalVocab.rootForms.getItems().map(v => v.text),
            variants: vocabVariantSerializer.serializeList(internalVocab.vocabVariants.getItems()),

            // mapping fields
            level: isMapping ? vocabOrMapping.level : VocabLevel.NEW,
            notes: isMapping ? vocabOrMapping.notes : null,
        };
    }
}

export const learnerVocabForTextSerializer = new LearnerVocabForTextSerializer();