import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class VocabTagSerializer extends CustomSerializer<VocabTag> {
    serialize(vocabTag: VocabTag, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: vocabTag.id,
            name: vocabTag.name,
            category: vocabTag.category?.name ?? null,
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const vocabTagSerializer = new VocabTagSerializer();