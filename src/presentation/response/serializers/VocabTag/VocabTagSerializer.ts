import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class VocabTagSerializer extends CustomSerializer<VocabTag> {
    readonly view: ViewDescription = {
        fields: ["id", "name",],
        relations: {category: {fields: ["name"]}}
    }

    serialize(vocabTag: VocabTag, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: vocabTag.id,
            name: vocabTag.name,
            category: vocabTag.category?.name ?? null,
        }, assertNoUndefined);
    }
}

export const vocabTagSerializer = new VocabTagSerializer();
