import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {MeaningSchema} from "dzelda-common";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {vocabSerializer} from "@/src/presentation/response/serializers/entities/VocabSerializer.js";
import {attributionSourceSerializer} from "@/src/presentation/response/serializers/entities/AttributionSourceSerializer.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/entities/VocabVariantSerializer.js";


class MeaningSerializer extends CustomEntitySerializer<Meaning, MeaningSchema> {

    definition(meaning: Meaning): CustomCallbackObject<Partial<MeaningSchema>> {
        return {
            id: () => meaning.id,
            text: () => meaning.text,
            //@ts-ignore
            vocab: (idOnly) => idOnly ? meaning.vocab.id : vocabSerializer.serialize(meaning.vocab, {ignore: ["meanings", "tags", "variants"]}),
            learnersCount: () => Number(meaning?.learnersCount),
            addedBy: () => meaning.addedBy == null ? "anonymous" : meaning.addedBy.user.username,
            language: () => meaning.language.code,
            addedOn: () => meaning.addedOn.toISOString(),
            attributionSource: (idOnly) => meaning.attributionSource ? (idOnly ? meaning.attributionSource.id : attributionSourceSerializer.serialize(meaning.attributionSource)) : null,
            attribution: () => meaning.attribution,
            vocabVariant: (idOnly: boolean) => meaning.vocabVariant ? (idOnly ? meaning.vocabVariant.id : vocabVariantSerializer.serialize(meaning.vocabVariant)) : null
        };
    }
}

export const meaningSerializer = new MeaningSerializer();
