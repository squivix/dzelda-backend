import {VocabSchema} from "@/src/schemas/response/interfaces/VocabSchema.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/schemas/response/serializers/CustomEntitySerializer.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {meaningSerializer} from "@/src/schemas/response/serializers/MeaningSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";

class VocabSerializer extends CustomEntitySerializer<Vocab | MapLearnerVocab, VocabSchema> {

    definition(vocabOrMapping: Vocab | MapLearnerVocab): CustomCallbackObject<VocabSchema> {
        if (vocabOrMapping instanceof Vocab) {
            return {
                id: () => vocabOrMapping.id,
                text: () => vocabOrMapping.text,
                isPhrase: () => vocabOrMapping.isPhrase,
                language: () => vocabOrMapping.language.code,
                meanings: () => meaningSerializer.serializeList(vocabOrMapping.meanings.getItems()),
            };
        } else {
            return {
                id: () => vocabOrMapping.vocab.id,
                text: () => vocabOrMapping.vocab.text,
                isPhrase: () => vocabOrMapping.vocab.isPhrase,
                level: () => vocabOrMapping.level,
                notes: () => vocabOrMapping.notes,
                language: () => vocabOrMapping.vocab.language.code,
                userMeanings: () => vocabOrMapping.userMeanings !== undefined ? meaningSerializer.serializeList(vocabOrMapping.userMeanings) : undefined,
                allMeanings: () => meaningSerializer.serializeList(vocabOrMapping.vocab.meanings.getItems())
            };
        }
    }

}

export const vocabSerializer = new VocabSerializer();