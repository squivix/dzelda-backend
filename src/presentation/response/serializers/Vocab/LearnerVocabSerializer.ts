import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {meaningSummerySerializer} from "@/src/presentation/response/serializers/Meaning/MeaningSummerySerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";

class LearnerVocabSerializer extends CustomSerializer<MapLearnerVocab> {
    serialize(mapping: MapLearnerVocab, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: mapping.vocab.id,
            text: mapping.vocab.text,
            isPhrase: mapping.vocab.isPhrase,
            level: mapping.level,
            notes: mapping.notes,
            language: mapping.vocab.language.code,
            learnerMeanings: meaningSummerySerializer.serializeList(mapping.vocab.learnerMeanings.getItems(), {assertNoUndefined}),
            meanings: meaningSummerySerializer.serializeList(mapping.vocab.meanings.getItems(), {assertNoUndefined}),
            learnersCount: Number(mapping.vocab.learnersCount),
            ttsPronunciationUrl: mapping.vocab.ttsPronunciations.getItems().pop()?.url ?? null,
            tags: vocabTagSerializer.serializeList(mapping.vocab.tags.getItems(), {assertNoUndefined}),
            rootForms: mapping.vocab.rootForms.getItems().map(v => v.text),
            variants: vocabVariantSerializer.serializeList(mapping.vocab.vocabVariants.getItems(), {assertNoUndefined})
        }, assertNoUndefined);
    }
}

export const learnerVocabSerializer = new LearnerVocabSerializer();
