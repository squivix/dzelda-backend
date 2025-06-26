import {FieldResolvers} from "@/src/models/viewResolver.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {vocabTagCategoryFieldResolvers} from "@/src/models/resolvers/vocabTagCategoryFieldResolvers.js";

export const vocabTagFieldResolvers: FieldResolvers<VocabTag> = {
    id: {type: "db"},
    name: {type: "db"},
    category: {type: "relation", populate: "category", resolvers: vocabTagCategoryFieldResolvers, relationType: "to-one"}
}