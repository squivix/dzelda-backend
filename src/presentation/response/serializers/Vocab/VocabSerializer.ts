import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MeaningSummerySerializer, meaningSummerySerializer} from "@/src/presentation/response/serializers/Meaning/MeaningSummerySerializer.js";
import {VocabTagSerializer, vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {VocabVariantSerializer, vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class VocabSerializer extends CustomSerializer<Vocab> {
    static readonly view: ViewDescription = {
        fields: ["id", "text", "isPhrase", "learnersCount", "textsCount"],
        relations: {
            language: {fields: ["code"]},
            tags: VocabTagSerializer.view,
            vocabVariants: VocabVariantSerializer.view,
            meanings: MeaningSummerySerializer.view
        }
    }

    serialize(vocab: Vocab, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: vocab.id,
            text: vocab.text,
            isPhrase: vocab.isPhrase,
            learnersCount: Number(vocab.learnersCount!),
            textsCount: Number(vocab.textsCount!),

            language: vocab.language.code,
            tags: vocabTagSerializer.serializeList(vocab.tags.getItems(), {assertNoUndefined}),
            variants: vocabVariantSerializer.serializeList(vocab.vocabVariants.getItems(), {assertNoUndefined}),
            meanings: meaningSummerySerializer.serializeList(vocab.meanings.getItems(), {assertNoUndefined}),
        }, assertNoUndefined);
    }
}

export const vocabSerializer = new VocabSerializer();
