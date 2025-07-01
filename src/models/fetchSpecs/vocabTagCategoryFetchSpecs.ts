import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {VocabTagCategory} from "@/src/models/entities/VocabTagCategory.js";

export const vocabTagCategoryFetchSpecs = () => ({
    id: {type: "db-column"},
    name: {type: "db-column"}
}) as const satisfies EntityFetchSpecs<VocabTagCategory>

export type VocabTagCategoryFetchSpecsType = ReturnType<typeof vocabTagCategoryFetchSpecs>;