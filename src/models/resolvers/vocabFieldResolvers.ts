import {FieldResolvers} from "@/src/models/viewResolver.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {languageFieldResolvers} from "@/src/models/resolvers/languageFieldResolvers.js";
import {vocabTagFieldResolvers} from "@/src/models/resolvers/vocabTagFieldResolvers.js";
import {meaningFieldResolvers} from "@/src/models/resolvers/meaningFieldResolvers.js";
import {vocabVariantFieldResolvers} from "@/src/models/resolvers/vocabVariantFieldResolvers.js";
import {ttsPronunciationFieldResolvers} from "@/src/models/resolvers/ttsPronunciationFieldResolvers.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";

export const vocabFieldResolvers: FieldResolvers<Vocab> = {
    id: {type: 'db'},
    text: {type: 'db'},
    isPhrase: {type: 'db'},
    learnersCount: {type: 'formula'},

    language: {type: "relation", populate: "language", resolvers: languageFieldResolvers},
    meanings: {
        type: "relation", populate: "meanings", resolvers: meaningFieldResolvers,
    },
    learnerMeanings: {
        type: 'relation',
        populate: 'learnerMeanings',
        resolvers: meaningFieldResolvers,
        defaultContextFilter: (context) => {
            if (!context.user || context.user instanceof AnonymousUser)
                throw new Error("Context doesn't have logged in user")
            return {learners: context.user.profile};
        }
    },
    ttsPronunciations: {
        type: 'relation',
        populate: 'ttsPronunciations',
        resolvers: ttsPronunciationFieldResolvers,
    },
    tags: {type: "relation", populate: "tags", resolvers: vocabTagFieldResolvers},
    vocabVariants: {type: 'relation', populate: 'vocabVariants', resolvers: vocabVariantFieldResolvers},
    // rootForms: {type: "relation", populate: "rootForms", resolvers: vocabFieldResolvers},
}


