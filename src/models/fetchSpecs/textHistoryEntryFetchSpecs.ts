import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {TextHistoryEntry} from "@/src/models/entities/TextHistoryEntry.js";
import {textFetchSpecs} from "@/src/models/fetchSpecs/textFetchSpecs.js";
import {profileFetchSpecs} from "@/src/models/fetchSpecs/profileFetchSpecs.js";

export const textHistoryEntryFetchSpecs = () => ({
    id: {type: "db-column"},
    text: {type: "relation", populate: "text", relationType: "to-one", entityFetchSpecs: textFetchSpecs,},
    timeViewed: {type: "db-column"},
    pastViewer: {type: "relation", populate: "pastViewer", relationType: "to-one", entityFetchSpecs: profileFetchSpecs},
}) as const satisfies EntityFetchSpecs<TextHistoryEntry>

export type TextHistoryEntryFetchSpecsType = ReturnType<typeof textHistoryEntryFetchSpecs>;