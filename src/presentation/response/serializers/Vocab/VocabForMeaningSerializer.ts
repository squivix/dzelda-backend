import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class VocabForMeaningSerializer extends CustomSerializer<Vocab> {
    serialize(vocab: Vocab, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: vocab.id,
            text: vocab.text,
            isPhrase: vocab.isPhrase,
            language: vocab.language.code,
            learnersCount: Number(vocab.learnersCount!),
            textsCount: Number(vocab.textsCount!),
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const vocabForMeaningSerializer = new VocabForMeaningSerializer();