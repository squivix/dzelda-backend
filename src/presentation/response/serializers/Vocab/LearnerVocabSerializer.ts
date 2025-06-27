import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {meaningSummerySerializer} from "@/src/presentation/response/serializers/Meaning/MeaningSummerySerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {vocabTagSerializer} from "@/src/presentation/response/serializers/VocabTag/VocabTagSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class LearnerVocabSerializer extends CustomSerializer<MapLearnerVocab> {
    static readonly view: ViewDescription = {
        fields: ["level", "notes"],
        relations: {
            vocab: {
                fields: ["id", "text", "isPhrase", "learnersCount"],
                relations: {
                    language: {fields: ["code"]},
                    ttsPronunciations: {fields: ["url"]},
                    tags: {
                        fields: ["id", "name",],
                        relations: {category: {fields: ["name"]}}
                    },
                    vocabVariants: {
                        fields: ["id", "text"],
                        relations: {ttsPronunciations: {fields: ["url"]}}
                    },
                    learnerMeanings: {
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
                    },
                }
            }
        }
    }

    serialize(mapping: MapLearnerVocab, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: mapping.vocab.id,
            text: mapping.vocab.text,
            isPhrase: mapping.vocab.isPhrase,
            learnersCount: Number(mapping.vocab.learnersCount),

            language: mapping.vocab.language.code,
            ttsPronunciationUrl: mapping.vocab.ttsPronunciations.getItems().pop()?.url ?? null,
            tags: vocabTagSerializer.serializeList(mapping.vocab.tags.getItems(), {assertNoUndefined}),
            rootForms: [],//mapping.vocab.rootForms.getItems().map(v => v.text),
            variants: vocabVariantSerializer.serializeList(mapping.vocab.vocabVariants.getItems(), {assertNoUndefined}),
            learnerMeanings: meaningSummerySerializer.serializeList(mapping.vocab.learnerMeanings.getItems(), {assertNoUndefined}),
            meanings: meaningSummerySerializer.serializeList(mapping.vocab.meanings.getItems(), {assertNoUndefined}),

            level: mapping.level,
            notes: mapping.notes,
        }, assertNoUndefined);
    }
}

export const learnerVocabSerializer = new LearnerVocabSerializer();
