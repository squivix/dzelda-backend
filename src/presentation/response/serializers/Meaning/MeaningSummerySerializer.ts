import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";

class MeaningSummerySerializer extends CustomSerializer<Meaning> {
    serialize(meaning: Meaning): any {
        return {
            id: meaning.id,
            text: meaning.text,
            vocab: meaning.vocab.id,
            learnersCount: Number(meaning?.learnersCount),
            addedBy: meaning.addedBy == null ? "anonymous" : meaning.addedBy.user.username,
            language: meaning.language.code,
            addedOn: meaning.addedOn.toISOString(),
            attributionSource: meaning.attributionSource ? meaning.attributionSource.id : null,
            attribution: meaning.attribution,
            vocabVariant: meaning.vocabVariant ? vocabVariantSerializer.serialize(meaning.vocabVariant) : null
        };
    }
}

export const meaningSummerySerializer = new MeaningSummerySerializer();