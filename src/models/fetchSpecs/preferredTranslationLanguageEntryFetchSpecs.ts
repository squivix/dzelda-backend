import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {PreferredTranslationLanguageEntry} from "@/src/models/entities/PreferredTranslationLanguageEntry.js";
import {translationLanguageFetchSpecs} from "@/src/models/fetchSpecs/translationLanguageFetchSpecs.js";
import {mapLearnerLanguageFetchSpecs} from "@/src/models/fetchSpecs/mapLearnerLanguageFetchSpecs.js";

export const preferredTranslationLanguageEntryFetchSpecs = () => ({
    id: {type: "db-column"},
    translationLanguage: {type: "relation", populate: "translationLanguage", entityFetchSpecs: translationLanguageFetchSpecs, relationType: "to-one"},
    learnerLanguageMapping: {type: "relation", populate: "learnerLanguageMapping", entityFetchSpecs: mapLearnerLanguageFetchSpecs, relationType: "to-one"},
    precedenceOrder: {type: "db-column"}
}) as const satisfies EntityFetchSpecs<PreferredTranslationLanguageEntry>

export type PreferredTranslationLanguageEntryFetchSpecsType = ReturnType<typeof preferredTranslationLanguageEntryFetchSpecs>;