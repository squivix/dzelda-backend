import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";

export const translationLanguageFieldFetchMap: FieldFetchSpecsMap<TranslationLanguage> = {
    id: {type: "db-column"},
    code: {type: "db-column"},
    name: {type: "db-column"},
    isDefault: {type: "db-column"},
}