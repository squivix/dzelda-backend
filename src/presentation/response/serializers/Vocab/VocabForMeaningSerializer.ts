import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {VocabFetchSpecsType} from "@/src/models/fetchSpecs/vocabFetchSpecs.js";

class VocabForMeaningSerializer extends CustomSerializer<Vocab> {
    readonly view: ViewDescriptionFromSpec<Vocab, VocabFetchSpecsType> = {
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
