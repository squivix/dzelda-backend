import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {languageFetchSpecs} from "@/src/models/fetchSpecs/languageFetchSpecs.js";
import {ttsVoiceFetchSpecs} from "@/src/models/fetchSpecs/ttsVoiceFetchSpecs.js";
import {preferredTranslationLanguageEntryFetchSpecs} from "@/src/models/fetchSpecs/preferredTranslationLanguageEntryFetchSpecs.js";

export const mapLearnerLanguageFetchSpecs = () => ({
    id: {type: "db-column"},
    startedLearningOn: {type: "db-column"},
    lastOpened: {type: "db-column"},
    language: ({type: "relation", populate: "language", relationType: "to-one", entityFetchSpecs: languageFetchSpecs}),
    preferredTtsVoice: ({type: "relation", populate: "preferredTtsVoice", relationType: "to-one", entityFetchSpecs: ttsVoiceFetchSpecs}),
    preferredTranslationLanguageEntries: ({
        type: "relation",
        populate: "preferredTranslationLanguageEntries",
        relationType: "to-many",
        entityFetchSpecs: preferredTranslationLanguageEntryFetchSpecs
    }),
}) as const satisfies  EntityFetchSpecs<MapLearnerLanguage>

export type MapLearnerLanguageFetchSpecsType = ReturnType<typeof mapLearnerLanguageFetchSpecs>;