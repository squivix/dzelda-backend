import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";

export const attributionSourceFetchSpecs = () => ({
    id: {type: "db-column"},
    name: {type: "db-column"},
    url: {type: "db-column"},
    logoUrl: {type: "db-column"},
}) as const satisfies EntityFetchSpecs<AttributionSource>

export type AttributionSourceFetchSpecsType = ReturnType<typeof attributionSourceFetchSpecs>;