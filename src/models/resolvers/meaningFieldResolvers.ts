import {FieldResolvers} from "@/src/models/viewResolver.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {vocabFieldResolvers} from "@/src/models/resolvers/vocabFieldResolvers.js";
import {profileFieldResolvers} from "@/src/models/resolvers/profileFieldResolvers.js";
import {languageFieldResolvers} from "@/src/models/resolvers/languageFieldResolvers.js";
import {attributionSourceResolvers} from "@/src/models/resolvers/attributionSourceResolvers.js";
import {vocabVariantFieldResolvers} from "@/src/models/resolvers/vocabVariantFieldResolvers.js";

export const meaningFieldResolvers: FieldResolvers<Meaning> = {
    id: {type: 'db'},
    text: {type: 'db'},
    learnersCount: {type: 'formula'},
    addedOn: {type: 'db'},
    attribution: {type: 'db'},
    vocab: {type: "relation", populate: "vocab", resolvers: vocabFieldResolvers},
    addedBy: {type: "relation", populate: "addedBy", resolvers: profileFieldResolvers},
    language: {type: "relation", populate: "language", resolvers: languageFieldResolvers},
    attributionSource: {type: "relation", populate: "attributionSource", resolvers: attributionSourceResolvers},
    vocabVariant: {type: "relation", populate: "vocabVariant", resolvers: vocabVariantFieldResolvers}
}