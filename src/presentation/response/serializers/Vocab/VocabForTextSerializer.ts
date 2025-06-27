import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {VocabLevel} from "dzelda-common";
import {VocabTagSerializer, vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {VocabVariantSerializer, vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";


class VocabForTextSerializer extends CustomSerializer<Vocab> {
    static readonly view: ViewDescription = {
        fields: ["id", "text", "isPhrase", "learnersCount"],
        relations: {
            language: {fields: ["code"]},
            ttsPronunciations: {fields: ["url"]},
            tags: VocabTagSerializer.view,
            vocabVariants: VocabVariantSerializer.view
        },
    }

    serialize(vocab: Vocab, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: vocab.id,
            text: vocab.text,
            isPhrase: vocab.isPhrase,
            learnersCount: Number(vocab.learnersCount),

            language: vocab.language.code,
            ttsPronunciationUrl: vocab.ttsPronunciations.getItems().pop()?.url ?? null,
            tags: vocabTagSerializer.serializeList(vocab.tags.getItems(), {assertNoUndefined}),
            rootForms: [],//vocab.rootForms.getItems().map(v => v.text),
            variants: vocabVariantSerializer.serializeList(vocab.vocabVariants.getItems(), {assertNoUndefined}),

            // mapping fields
            level: VocabLevel.NEW,
            notes: null,
        }, assertNoUndefined);
    }
}

export const vocabForTextSerializer = new VocabForTextSerializer();
