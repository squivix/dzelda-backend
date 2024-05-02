import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {MeaningSchema} from "dzelda-common";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {vocabSerializer} from "@/src/presentation/response/serializers/entities/VocabSerializer.js";
import {attributionSourceSerializer} from "@/src/presentation/response/serializers/entities/AttributionSourceSerializer.js";


class MeaningSerializer extends CustomEntitySerializer<Meaning, MeaningSchema> {

    definition(meaning: Meaning): CustomCallbackObject<Partial<MeaningSchema>> {
        return {
            id: () => meaning.id,
            text: () => meaning.text,
            //@ts-ignore
            vocab: () => vocabSerializer.serialize(meaning.vocab, {ignore: ["meanings","tags"]}),
            learnersCount: () => Number(meaning?.learnersCount),
            addedBy: () => meaning.addedBy == null ? "anonymous" : meaning.addedBy.user.username,
            language: () => meaning.language.code,
            addedOn: () => meaning.addedOn.toISOString(),
            attributionSource: () => meaning.attributionSource ? attributionSourceSerializer.serialize(meaning.attributionSource) : null,
            attribution: () => meaning.attribution,
        };
    }
}

export const meaningSerializer = new MeaningSerializer();
