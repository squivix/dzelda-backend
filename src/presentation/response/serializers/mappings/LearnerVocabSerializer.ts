import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {LearnerVocabSchema, VocabLevel} from "dzelda-common";
import {meaningSerializer} from "@/src/presentation/response/serializers/entities/MeaningSerializer.js";
import {vocabTagSerializer} from "@/src/presentation/response/serializers/entities/VocabTagSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/entities/VocabVariantSerializer.js";

export class LearnerVocabSerializer extends CustomEntitySerializer<Vocab | MapLearnerVocab, LearnerVocabSchema> {
    definition(vocabOrMapping: Vocab | MapLearnerVocab): CustomCallbackObject<Partial<LearnerVocabSchema>> {
        //if only vocab is sent
        if (vocabOrMapping instanceof Vocab) {
            //assume it's new
            const newVocab = vocabOrMapping;
            return {
                id: () => newVocab.id,
                text: () => newVocab.text,
                isPhrase: () => newVocab.isPhrase,
                level: () => VocabLevel.NEW,
                notes: () => null,
                language: () => newVocab.language.code,
                learnerMeanings: () => [],
                //@ts-ignore
                meanings: () => meaningSerializer.serializeList(newVocab.meanings.getItems(), {ignore: ["vocab"], idOnlyFields: ["attributionSource", "vocabVariant"]}),
                ttsPronunciationUrl: () => newVocab.ttsPronunciations.getItems().pop()?.url ?? null,
                tags: () => vocabTagSerializer.serializeList(newVocab.tags.getItems()),
                learnersCount: () => Number(newVocab.learnersCount),
                rootForms: () => newVocab.rootForms.getItems().map(v => v.text),
                variants: () => vocabVariantSerializer.serializeList(newVocab.vocabVariants.getItems())
            };
        } else {
            const mapping = vocabOrMapping;
            return {
                id: () => mapping.vocab.id,
                text: () => mapping.vocab.text,
                isPhrase: () => mapping.vocab.isPhrase,
                level: () => mapping.level,
                notes: () => mapping.notes,
                language: () => mapping.vocab.language.code,
                // @ts-ignore
                learnerMeanings: () => meaningSerializer.serializeList(mapping.vocab.learnerMeanings.getItems(), {idOnlyFields: ["vocab", "vocabVariant"]}),
                // @ts-ignore
                meanings: () => meaningSerializer.serializeList(mapping.vocab.meanings.getItems(), {idOnlyFields: ["vocab", "attributionSource", "vocabVariant"]}),
                learnersCount: () => Number(mapping.vocab.learnersCount),
                ttsPronunciationUrl: () => mapping.vocab.ttsPronunciations.getItems().pop()?.url ?? null,
                tags: () => vocabTagSerializer.serializeList(mapping.vocab.tags.getItems()),
                rootForms: () => mapping.vocab.rootForms.getItems().map(v => v.text),
                variants: () => vocabVariantSerializer.serializeList(mapping.vocab.vocabVariants.getItems())
            };
        }
    }

}

export const learnerVocabSerializer = new LearnerVocabSerializer();
