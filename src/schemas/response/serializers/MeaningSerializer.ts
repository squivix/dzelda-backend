import {CustomCallbackObject, CustomEntitySerializer} from "@/src/schemas/response/serializers/CustomEntitySerializer.js";
import {MeaningSchema} from "@/src/schemas/response/interfaces/MeaningSchema.js";
import {Meaning} from "@/src/models/entities/Meaning.js";


class MeaningSerializer extends CustomEntitySerializer<Meaning, MeaningSchema> {
    definition(meaning: Meaning): CustomCallbackObject<Partial<MeaningSchema>> {
        return {};
    }
}

export const meaningSerializer = new MeaningSerializer();
