import {FieldResolvers} from "@/src/models/viewResolver.js";
import {VocabTagCategory} from "@/src/models/entities/VocabTagCategory.js";

export const vocabTagCategoryFieldResolvers: FieldResolvers<VocabTagCategory> = {
    id: {type: "db"},
    name: {type: "db"}
}