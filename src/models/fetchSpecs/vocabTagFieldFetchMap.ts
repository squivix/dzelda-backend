import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {vocabTagCategoryFieldFetchMap} from "@/src/models/fetchSpecs/vocabTagCategoryFieldFetchMap.js";

export const vocabTagFieldFetchMap: FieldFetchSpecsMap<VocabTag> = {
    id: {type: "db-column"},
    name: {type: "db-column"},
    category: {type: "relation", populate: "category", fieldFetchSpecsMap: vocabTagCategoryFieldFetchMap, relationType: "to-one"}
}