import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class VocabVariantSerializer extends CustomSerializer<VocabVariant> {
    serialize(vocabVariant: VocabVariant, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: vocabVariant.id,
            text: vocabVariant.text,
            ttsPronunciationUrl: vocabVariant.ttsPronunciations.getItems().pop()?.url ?? null,
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const vocabVariantSerializer = new VocabVariantSerializer();