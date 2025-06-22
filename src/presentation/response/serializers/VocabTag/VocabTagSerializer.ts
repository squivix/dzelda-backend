import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";

class VocabTagSerializer extends CustomSerializer<VocabTag> {
    serialize(vocabTag: VocabTag): any {
        return {
            id: vocabTag.id,
            name: vocabTag.name,
            category: vocabTag.category?.name ?? null,
        };
    }
}

export const vocabTagSerializer = new VocabTagSerializer();