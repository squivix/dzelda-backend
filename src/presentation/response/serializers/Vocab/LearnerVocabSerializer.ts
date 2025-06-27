import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {MeaningSummerySerializer, meaningSummerySerializer} from "@/src/presentation/response/serializers/Meaning/MeaningSummerySerializer.js";
import {VocabVariantSerializer, vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {VocabTagSerializer, vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class LearnerVocabSerializer extends CustomSerializer<MapLearnerVocab> {
    static readonly view: ViewDescription = {
        fields: ["level", "notes"],
        relations: {
            vocab: {
                fields: ["id", "text", "isPhrase", "learnersCount"],
                relations: {
                    language: {fields: ["code"]},
                    ttsPronunciations: {fields: ["url"]},
                    tags: VocabTagSerializer.view,
                    vocabVariants: VocabVariantSerializer.view,
                    learnerMeanings: MeaningSummerySerializer.view,
                    meanings: MeaningSummerySerializer.view,
                }
            }
        }
    }

    serialize(mapping: MapLearnerVocab, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: mapping.vocab.id,
            text: mapping.vocab.text,
            isPhrase: mapping.vocab.isPhrase,
            learnersCount: Number(mapping.vocab.learnersCount),

            language: mapping.vocab.language.code,
            ttsPronunciationUrl: mapping.vocab.ttsPronunciations.getItems().pop()?.url ?? null,
            tags: vocabTagSerializer.serializeList(mapping.vocab.tags.getItems(), {assertNoUndefined}),
            rootForms: [],//mapping.vocab.rootForms.getItems().map(v => v.text),
            variants: vocabVariantSerializer.serializeList(mapping.vocab.vocabVariants.getItems(), {assertNoUndefined}),
            learnerMeanings: meaningSummerySerializer.serializeList(mapping.vocab.learnerMeanings.getItems(), {assertNoUndefined}),
            meanings: meaningSummerySerializer.serializeList(mapping.vocab.meanings.getItems(), {assertNoUndefined}),

            level: mapping.level,
            notes: mapping.notes,
        }, assertNoUndefined);
    }
}

export const learnerVocabSerializer = new LearnerVocabSerializer();
