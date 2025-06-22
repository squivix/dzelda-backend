import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";

class VocabVariantSerializer extends CustomSerializer<VocabVariant> {
    serialize(vocabVariant: VocabVariant): any {
        return {
            id: vocabVariant.id,
            text: vocabVariant.text,
            ttsPronunciationUrl: vocabVariant.ttsPronunciations.getItems().pop()?.url ?? null,
        };
    }
}

export const vocabVariantSerializer = new VocabVariantSerializer();