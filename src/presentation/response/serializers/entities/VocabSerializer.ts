import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MeaningSchema, VocabSchema} from "dzelda-types";
import {meaningSerializer} from "@/src/presentation/response/serializers/entities/MeaningSerializer.js";

class VocabSerializer extends CustomEntitySerializer<Vocab, VocabSchema> {
    definition(vocab: Vocab): CustomCallbackObject<VocabSchema> {
        return {
            id: () => vocab.id,
            text: () => vocab.text,
            isPhrase: () => vocab.isPhrase,
            language: () => vocab.language.code,
            meanings: () => meaningSerializer.serializeList(vocab.meanings.getItems(), {ignore: ["vocab"]}) as MeaningSchema[],
            learnersCount: () => Number(vocab.learnersCount!),
            lessonsCount: () => Number(vocab.lessonsCount!)
        };
    }
}

export const vocabSerializer = new VocabSerializer();
