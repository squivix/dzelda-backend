import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {languageFieldFetchMap} from "@/src/models/fetchSpecs/languageFieldFetchMap.js";
import {vocabTagFieldFetchMap} from "@/src/models/fetchSpecs/vocabTagFieldFetchMap.js";
import {meaningFieldFetchMap} from "@/src/models/fetchSpecs/meaningFieldFetchMap.js";
import {vocabVariantFieldFetchMap} from "@/src/models/fetchSpecs/vocabVariantFieldFetchMap.js";
import {ttsPronunciationFieldFetchMap} from "@/src/models/fetchSpecs/ttsPronunciationFieldFetchMap.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";

export const vocabFieldFetchMap: FieldFetchSpecsMap<Vocab> = {
    id: {type: "db-column"},
    text: {type: "db-column"},
    isPhrase: {type: "db-column"},
    learnersCount: {type: "formula"},

    language: {type: "relation", populate: "language", fieldFetchSpecsMap: languageFieldFetchMap, relationType: "to-one"},
    meanings: {type: "relation", populate: "meanings", fieldFetchSpecsMap: meaningFieldFetchMap, relationType: "to-many"},
    learnerMeanings: {
        type: "relation",
        populate: "learnerMeanings",
        fieldFetchSpecsMap: meaningFieldFetchMap,
        relationType: "to-many",
        defaultContextFilter: (context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            return {learners: context.user.profile};
        }
    },
    ttsPronunciations: {
        type: "relation",
        populate: "ttsPronunciations",
        fieldFetchSpecsMap: ttsPronunciationFieldFetchMap,
        relationType: "to-many"
    },
    tags: {type: "relation", populate: "tags", fieldFetchSpecsMap: vocabTagFieldFetchMap, relationType: "to-many"},
    vocabVariants: {type: "relation", populate: "vocabVariants", fieldFetchSpecsMap: vocabVariantFieldFetchMap, relationType: "to-many"},
}


