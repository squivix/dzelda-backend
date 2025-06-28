import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class VocabForMeaningSerializer extends CustomSerializer<Vocab> {
    readonly view: ViewDescription = {
        fields: ["id", "text", "isPhrase", "learnersCount", "textsCount"],
        relations: {language: {fields: ["code"]}}
    }

    serialize(vocab: Vocab, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: vocab.id,
            text: vocab.text,
            isPhrase: vocab.isPhrase,
            learnersCount: Number(vocab.learnersCount!),
            textsCount: Number(vocab.textsCount!),

            language: vocab.language.code,
        }, assertNoUndefined);
    }
}

export const vocabForMeaningSerializer = new VocabForMeaningSerializer();
