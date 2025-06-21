import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";
import {VocabVariantSchema} from "dzelda-common";

class VocabVariantSerializer extends CustomEntitySerializer<VocabVariant, VocabVariantSchema> {
    definition(vocabVariant: VocabVariant): CustomCallbackObject<VocabVariantSchema> {
        return {
            id: () => vocabVariant.id,
            text: () => vocabVariant.text,
            ttsPronunciationUrl: () => vocabVariant.ttsPronunciations.getItems().pop()?.url ?? null,
        };
    }
}

export const vocabVariantSerializer = new VocabVariantSerializer();
