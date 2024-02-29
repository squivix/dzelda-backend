import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {VocabTagSchema} from "dzelda-common";

export class VocabTagSerializer extends CustomEntitySerializer<VocabTag, VocabTagSchema> {
    definition(vocabTag: VocabTag): CustomCallbackObject<Partial<VocabTagSchema>> {
        return {
            id: () => vocabTag.id,
            name: () => vocabTag.name,
            category: () => vocabTag.category?.name,
        };
    }
}

export const vocabTagSerializer = new VocabTagSerializer();
