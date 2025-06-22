import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {meaningSummerySerializer} from "@/src/presentation/response/serializers/Meaning/MeaningSummerySerializer.js";
import {vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";

class VocabSerializer extends CustomSerializer<Vocab> {
    serialize(vocab: Vocab): any {
        return {
            id: vocab.id,
            text: vocab.text,
            isPhrase: vocab.isPhrase,
            language: vocab.language.code,
            meanings: meaningSummerySerializer.serializeList(vocab.meanings.getItems()),
            tags: vocabTagSerializer.serializeList(vocab.tags.getItems()),
            variants: vocabVariantSerializer.serializeList(vocab.vocabVariants.getItems()),
            learnersCount: Number(vocab.learnersCount!),
            textsCount: Number(vocab.textsCount!),
        };
    }
}

export const vocabSerializer = new VocabSerializer();