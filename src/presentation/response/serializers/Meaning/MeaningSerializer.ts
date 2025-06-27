import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {AttributionSourceSerializer, attributionSourceSerializer} from "@/src/presentation/response/serializers/AttributionSource/AttributionSourceSerializer.js";
import {VocabForMeaningSerializer, vocabForMeaningSerializer} from "@/src/presentation/response/serializers/Vocab/VocabForMeaningSerializer.js";
import {VocabVariantSerializer, vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class MeaningSerializer extends CustomSerializer<Meaning> {
    static readonly view: ViewDescription = {
        fields: ["id", "text", "learnersCount", "addedOn", "attribution",],
        relations: {
            language: {fields: ["code"]},
            addedBy: {
                fields: [],
                relations: {user: {fields: ["username"]}}
            },
            vocab: VocabForMeaningSerializer.view,
            vocabVariant: VocabVariantSerializer.view,
            attributionSource: AttributionSourceSerializer.view
        }
    }

    serialize(meaning: Meaning, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: meaning.id,
            text: meaning.text,
            learnersCount: Number(meaning?.learnersCount),
            addedOn: meaning.addedOn.toISOString(),
            attribution: meaning.attribution,

            language: meaning.language.code,
            addedBy: meaning.addedBy == null ? "anonymous" : meaning.addedBy.user.username,
            vocab: vocabForMeaningSerializer.serialize(meaning.vocab, {assertNoUndefined}),
            vocabVariant: meaning.vocabVariant ? vocabVariantSerializer.serialize(meaning.vocabVariant, {assertNoUndefined}) : null,
            attributionSource: meaning.attributionSource ? attributionSourceSerializer.serialize(meaning.attributionSource, {assertNoUndefined}) : null,
        }, assertNoUndefined);
    }
}

export const meaningSerializer = new MeaningSerializer();
