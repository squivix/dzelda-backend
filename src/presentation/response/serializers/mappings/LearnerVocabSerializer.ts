import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {LearnerVocabSchema, MeaningSchema, TTSPronunciationSchema} from "dzelda-common";
import {meaningSerializer} from "@/src/presentation/response/serializers/entities/MeaningSerializer.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {ttsPronunciationSerializer} from "@/src/presentation/response/serializers/entities/TTSPronunciationSerializer.js";

export class LearnerVocabSerializer extends CustomEntitySerializer<Vocab | MapLearnerVocab, LearnerVocabSchema> {
    definition(vocabOrMapping: Vocab | MapLearnerVocab): CustomCallbackObject<Partial<LearnerVocabSchema>> {
        //if only vocab is sent
        if (vocabOrMapping instanceof Vocab) {
            //assume it's new
            return {
                id: () => vocabOrMapping.id,
                text: () => vocabOrMapping.text,
                isPhrase: () => vocabOrMapping.isPhrase,
                level: () => VocabLevel.NEW,
                notes: () => null,
                language: () => vocabOrMapping.language.code,
                learnerMeanings: () => [],
                // @ts-ignore
                meanings: () => meaningSerializer.serializeList(vocabOrMapping.meanings.getItems(), {ignore: ["vocab"]}) as Omit<MeaningSchema, "vocab">[],
                ttsPronunciations: () => ttsPronunciationSerializer.serializeList(vocabOrMapping.ttsPronunciations.getItems()) as TTSPronunciationSchema[],
            };
        } else {
            return {
                id: () => vocabOrMapping.vocab.id,
                text: () => vocabOrMapping.vocab.text,
                isPhrase: () => vocabOrMapping.vocab.isPhrase,
                level: () => vocabOrMapping.level,
                notes: () => vocabOrMapping.notes,
                language: () => vocabOrMapping.vocab.language.code,
                // @ts-ignore
                learnerMeanings: () => meaningSerializer.serializeList(vocabOrMapping.vocab.learnerMeanings.getItems(), {ignore: ["vocab"]}) as Omit<MeaningSchema, "vocab">[],
                // @ts-ignore
                meanings: () => meaningSerializer.serializeList(vocabOrMapping.vocab.meanings.getItems(), {ignore: ["vocab"]}) as Omit<MeaningSchema, "vocab">[],
                ttsPronunciations: () => ttsPronunciationSerializer.serializeList(vocabOrMapping.vocab.ttsPronunciations.getItems(), {ignore: ["vocab"]}) as TTSPronunciationSchema[],
            };
        }
    }

}

export const learnerVocabSerializer = new LearnerVocabSerializer();
