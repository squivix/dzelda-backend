import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {vocabFetchSpecs} from "@/src/models/fetchSpecs/vocabFetchSpecs.js";
import {profileFetchSpecs} from "@/src/models/fetchSpecs/profileFetchSpecs.js";

export const mapLearnerVocabFetchSpecs = () => ({
    id: {type: "db-column"},
    level: {type: "db-column"},
    notes: {type: "db-column"},
    savedOn: {type: "db-column"},
    vocab: {type: "relation", populate: "vocab", relationType: "to-one", entityFetchSpecs: vocabFetchSpecs},
    learner: {type: "relation", populate: "learner", relationType: "to-one", entityFetchSpecs: profileFetchSpecs},
}) as const satisfies EntityFetchSpecs<MapLearnerVocab>

export type MapLearnerVocabFetchSpecsType = ReturnType<typeof mapLearnerVocabFetchSpecs>;