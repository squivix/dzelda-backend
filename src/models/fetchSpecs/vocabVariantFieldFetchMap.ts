import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";
import {ttsPronunciationFieldFetchMap} from "@/src/models/fetchSpecs/ttsPronunciationFieldFetchMap.js";


export const vocabVariantFieldFetchMap: FieldFetchSpecsMap<VocabVariant> = {
    id: {type: 'db-column'},
    text: {type: 'db-column'},
    ttsPronunciations: {
        type: 'relation',
        populate: 'ttsPronunciations',
        fieldFetchSpecsMap: ttsPronunciationFieldFetchMap,
        relationType: "to-many"
    },
};