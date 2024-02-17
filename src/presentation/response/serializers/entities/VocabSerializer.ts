import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MeaningSchema, VocabSchema} from "dzelda-common";
import {meaningSerializer} from "@/src/presentation/response/serializers/entities/MeaningSerializer.js";

class VocabSerializer extends CustomEntitySerializer<Vocab, VocabSchema> {
    definition(vocab: Vocab): CustomCallbackObject<VocabSchema> {
        return {
            id: () => vocab.id,
            text: () => vocab.text,
            isPhrase: () => vocab.isPhrase,
            language: () => vocab.language.code,
            // @ts-ignore
            meanings: () => meaningSerializer.serializeList(vocab.meanings.getItems(), {ignore: ["vocab"]}) as Omit<MeaningSchema, "vocab">[],
            learnersCount: () => Number(vocab.learnersCount!),
            textsCount: () => Number(vocab.textsCount!),
        };
    }
}

export const vocabSerializer = new VocabSerializer();
