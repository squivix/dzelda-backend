import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";

class VocabForMeaningSerializer extends CustomSerializer<Vocab> {
    serialize(vocab: Vocab, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: vocab.id,
            text: vocab.text,
            isPhrase: vocab.isPhrase,
            language: vocab.language.code,
            learnersCount: Number(vocab.learnersCount!),
            textsCount: Number(vocab.textsCount!),
        }, assertNoUndefined);
    }
}

export const vocabForMeaningSerializer = new VocabForMeaningSerializer();
