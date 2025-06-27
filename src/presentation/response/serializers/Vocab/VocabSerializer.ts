import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {meaningSummerySerializer} from "@/src/presentation/response/serializers/Meaning/MeaningSummerySerializer.js";
import {vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class VocabSerializer extends CustomSerializer<Vocab> {
    static readonly view: ViewDescription = {
        fields: ["id", "text", "isPhrase", "learnersCount", "textsCount"],
        relations: {
            language: {fields: ["code"]},
            tags: {
                fields: ["id", "name",],
                relations: {category: {fields: ["name"]}}
            },
            vocabVariants: {
                fields: ["id", "text"],
                relations: {ttsPronunciations: {fields: ["url"]}}
            },
            meanings: {
                fields: ["id", "text", "learnersCount", "addedOn", "attribution", "vocab"],
                relations: {
                    language: {fields: ["code"]},
                    addedBy: {
                        fields: [],
                        relations: {user: {fields: ["username"]}}
                    },
                    vocabVariant: {
                        fields: ["id", "text"],
                        relations: {ttsPronunciations: {fields: ["url"]}}
                    },
                    attributionSource: {
                        fields: ["id", "name", "url", "logoUrl",]
                    }
                }
            }
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
