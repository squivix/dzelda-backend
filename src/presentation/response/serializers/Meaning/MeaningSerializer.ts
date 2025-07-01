import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {attributionSourceSerializer} from "@/src/presentation/response/serializers/AttributionSource/AttributionSourceSerializer.js";
import {vocabForMeaningSerializer} from "@/src/presentation/response/serializers/Vocab/VocabForMeaningSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {ViewDescription, ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {MeaningFetchSpecsType} from "@/src/models/fetchSpecs/meaningFetchSpecs.js";

class MeaningSerializer extends CustomSerializer<Meaning> {
    readonly view: ViewDescriptionFromSpec<Meaning, MeaningFetchSpecsType> = {
        fields: ["id", "text", "learnersCount", "addedOn", "attribution",],
        relations: {
            language: {fields: ["code"]},
            addedBy: {
                fields: [],
                relations: {user: {fields: ["username"]}}
            },
            vocab: vocabForMeaningSerializer.view,
            vocabVariant: vocabVariantSerializer.view,
            attributionSource: attributionSourceSerializer.view
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
