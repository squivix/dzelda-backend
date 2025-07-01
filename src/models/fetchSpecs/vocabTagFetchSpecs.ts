import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {vocabTagCategoryFetchSpecs} from "@/src/models/fetchSpecs/vocabTagCategoryFetchSpecs.js";

export const vocabTagFetchSpecs = () => ({
    id: {type: "db-column"},
    name: {type: "db-column"},
    category: {type: "relation", populate: "category", entityFetchSpecs: vocabTagCategoryFetchSpecs, relationType: "to-one"}
}) as const satisfies EntityFetchSpecs<VocabTag>

export type VocabTagFetchSpecsType = ReturnType<typeof vocabTagFetchSpecs>;