import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {MapLearnerVocabFetchSpecsType} from "@/src/models/fetchSpecs/mapLearnerVocabFetchSpecs.js";


class LearnerVocabForTextSerializer extends CustomSerializer<MapLearnerVocab> {
    readonly view: ViewDescriptionFromSpec<MapLearnerVocab, MapLearnerVocabFetchSpecsType> = {
        fields: ["level", "notes"],
        relations: {
            vocab: {
                fields: ["id", "text", "isPhrase", "learnersCount"],
                relations: {
                    language: {fields: ["code"]},
                    ttsPronunciations: {fields: ["url"]},
                    tags: vocabTagSerializer.view,
                    vocabVariants: vocabVariantSerializer.view
                },
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
            rootForms: [],//vocabOrMapping.vocab.rootForms.getItems().map(v => v.text),
            variants: vocabVariantSerializer.serializeList(mapping.vocab.vocabVariants.getItems(), {assertNoUndefined}),

            // mapping fields
            level: mapping.level,
            notes: mapping.notes,
        }, assertNoUndefined);
    }
}

export const learnerVocabForTextSerializer = new LearnerVocabForTextSerializer();
