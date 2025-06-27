import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";

class VocabTagSerializer extends CustomSerializer<VocabTag> {
    serialize(vocabTag: VocabTag, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: vocabTag.id,
            name: vocabTag.name,
            category: vocabTag.category?.name ?? null,
        }, assertNoUndefined);
    }
}

export const vocabTagSerializer = new VocabTagSerializer();
