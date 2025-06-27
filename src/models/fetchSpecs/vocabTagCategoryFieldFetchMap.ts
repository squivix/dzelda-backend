import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {VocabTagCategory} from "@/src/models/entities/VocabTagCategory.js";

export const vocabTagCategoryFieldFetchMap: FieldFetchSpecsMap<VocabTagCategory> = {
    id: {type: "db-column"},
    name: {type: "db-column"}
}