import {FieldResolvers} from "@/src/models/viewResolver.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";
import {ttsPronunciationFieldResolvers} from "@/src/models/resolvers/ttsPronunciationFieldResolvers.js";


export const vocabVariantFieldResolvers: FieldResolvers<VocabVariant> = {
    id: {type: 'db'},
    text: {type: 'db'},
    ttsPronunciations: {
        type: 'relation',
        populate: 'ttsPronunciations',
        resolvers: ttsPronunciationFieldResolvers,
        relationType: "to-many"
    },
};