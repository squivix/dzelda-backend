import {FieldResolvers} from "@/src/models/viewResolver.js";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";

export const attributionSourceResolvers: FieldResolvers<AttributionSource> = {
    id: {type: "db"},
    name: {type: "db"},
    url: {type: "db"},
    logoUrl: {type: "db"},
}