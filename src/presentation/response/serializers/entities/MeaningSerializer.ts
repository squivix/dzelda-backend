import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {MeaningSchema} from "@/src/presentation/response/interfaces/entities/MeaningSchema.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {vocabSerializer} from "@/src/presentation/response/serializers/entities/VocabSerializer.js";


class MeaningSerializer extends CustomEntitySerializer<Meaning, MeaningSchema> {

    definition(meaning: Meaning): CustomCallbackObject<Partial<MeaningSchema>> {
        return {
            id: () => meaning.id,
            text: () => meaning.text,
            vocab: () => vocabSerializer.serialize(meaning.vocab, {ignore: ["meanings"]}),
            learnersCount: () => Number(meaning?.learnersCount),
            addedBy: () => meaning.addedBy.user.username,
            language: () => meaning.language.code,
            addedOn: () => meaning.addedOn.toISOString(),
        };
    }
}

export const meaningSerializer = new MeaningSerializer();
