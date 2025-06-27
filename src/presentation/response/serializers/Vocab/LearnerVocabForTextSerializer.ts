import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {VocabLevel} from "dzelda-common";
import {vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";


class LearnerVocabForTextSerializer extends CustomSerializer<Vocab | MapLearnerVocab> {

    serialize(vocabOrMapping: Vocab | MapLearnerVocab, {assertNoUndefined = true} = {}): any {
        const isMapping = vocabOrMapping instanceof MapLearnerVocab;
        const internalVocab = isMapping ? vocabOrMapping.vocab : vocabOrMapping;

        return this.finalizePojo({
            id: internalVocab.id,
            text: internalVocab.text,
            isPhrase: internalVocab.isPhrase,
            learnersCount: Number(internalVocab.learnersCount),
            language: internalVocab.language.code,
            ttsPronunciationUrl: internalVocab.ttsPronunciations.getItems().pop()?.url ?? null,
            tags: vocabTagSerializer.serializeList(internalVocab.tags.getItems(), {assertNoUndefined}),
            rootForms: internalVocab.rootForms.getItems().map(v => v.text),
            variants: vocabVariantSerializer.serializeList(internalVocab.vocabVariants.getItems(), {assertNoUndefined}),

            // mapping fields
            level: isMapping ? vocabOrMapping.level : VocabLevel.NEW,
            notes: isMapping ? vocabOrMapping.notes : null,
        }, assertNoUndefined);
    }
}

export const learnerVocabForTextSerializer = new LearnerVocabForTextSerializer();
