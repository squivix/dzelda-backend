import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";

export const translationLanguageFetchSpecs = () => ({
    id: {type: "db-column"},
    code: {type: "db-column"},
    name: {type: "db-column"},
    isDefault: {type: "db-column"},
}) as const satisfies EntityFetchSpecs<TranslationLanguage>

export type TranslationLanguageFetchSpecsType = ReturnType<typeof translationLanguageFetchSpecs>;