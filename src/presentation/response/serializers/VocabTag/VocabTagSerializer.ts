import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {VocabTagFetchSpecsType} from "@/src/models/fetchSpecs/vocabTagFetchSpecs.js";

class VocabTagSerializer extends CustomSerializer<VocabTag> {
    readonly view: ViewDescriptionFromSpec<VocabTag, VocabTagFetchSpecsType> = {
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
