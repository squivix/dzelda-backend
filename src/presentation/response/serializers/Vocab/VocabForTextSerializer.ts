import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {VocabLevel} from "dzelda-common";
import {vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {VocabFetchSpecsType} from "@/src/models/fetchSpecs/vocabFetchSpecs.js";


class VocabForTextSerializer extends CustomSerializer<Vocab> {
    readonly view: ViewDescriptionFromSpec<Vocab, VocabFetchSpecsType> = {
        fields: ["id", "text", "isPhrase", "learnersCount"],
        relations: {
            language: {fields: ["code"]},
            ttsPronunciations: {fields: ["url"]},
            tags: vocabTagSerializer.view,
            vocabVariants: vocabVariantSerializer.view
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
