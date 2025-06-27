import {FieldFetchSpecsMap} from "@/src/models/viewResolver.js";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";

export const attributionSourceFieldFetchMap: FieldFetchSpecsMap<AttributionSource> = {
    id: {type: 'db-column'},
    name: {type: 'db-column'},
    url: {type: 'db-column'},
    logoUrl: {type: 'db-column'},
}