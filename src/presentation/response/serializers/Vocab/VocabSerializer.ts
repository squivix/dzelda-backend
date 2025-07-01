import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {meaningSummerySerializer} from "@/src/presentation/response/serializers/Meaning/MeaningSummerySerializer.js";
import {vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {VocabFetchSpecsType} from "@/src/models/fetchSpecs/vocabFetchSpecs.js";

class VocabSerializer extends CustomSerializer<Vocab> {
    readonly view: ViewDescriptionFromSpec<Vocab, VocabFetchSpecsType> = {
        fields: ["id", "text", "isPhrase", "learnersCount", "textsCount"],
        relations: {
            language: {fields: ["code"]},
            tags: vocabTagSerializer.view,
            vocabVariants: vocabVariantSerializer.view,
            meanings: meaningSummerySerializer.view
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
