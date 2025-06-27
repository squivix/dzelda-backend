import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {attributionSourceSerializer} from "@/src/presentation/response/serializers/AttributionSource/AttributionSourceSerializer.js";
import {vocabForMeaningSerializer} from "@/src/presentation/response/serializers/Vocab/VocabForMeaningSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";

class MeaningSerializer extends CustomSerializer<Meaning> {
    serialize(meaning: Meaning, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: meaning.id,
            text: meaning.text,
            vocab: vocabForMeaningSerializer.serialize(meaning.vocab, {assertNoUndefined}),
            learnersCount: Number(meaning?.learnersCount),
            addedBy: meaning.addedBy == null ? "anonymous" : meaning.addedBy.user.username,
            language: meaning.language.code,
            addedOn: meaning.addedOn.toISOString(),
            attributionSource: meaning.attributionSource ? attributionSourceSerializer.serialize(meaning.attributionSource, {assertNoUndefined}) : null,
            attribution: meaning.attribution,
            vocabVariant: meaning.vocabVariant ? vocabVariantSerializer.serialize(meaning.vocabVariant, {assertNoUndefined}) : null
        }, assertNoUndefined);
    }
}

export const meaningSerializer = new MeaningSerializer();
