import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {meaningSummerySerializer} from "@/src/presentation/response/serializers/Meaning/MeaningSummerySerializer.js";
import {vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class VocabSerializer extends CustomSerializer<Vocab> {
    serialize(vocab: Vocab, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: vocab.id,
            text: vocab.text,
            isPhrase: vocab.isPhrase,
            language: vocab.language.code,
            meanings: meaningSummerySerializer.serializeList(vocab.meanings.getItems(), {assertNoUndefined}),
            tags: vocabTagSerializer.serializeList(vocab.tags.getItems(), {assertNoUndefined}),
            variants: vocabVariantSerializer.serializeList(vocab.vocabVariants.getItems(), {assertNoUndefined}),
            learnersCount: Number(vocab.learnersCount!),
            textsCount: Number(vocab.textsCount!),
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const vocabSerializer = new VocabSerializer();