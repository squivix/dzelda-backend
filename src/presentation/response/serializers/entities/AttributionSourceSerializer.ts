import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";
import {AttributionSourceSchema} from "dzelda-common";

export class AttributionSourceSerializer extends CustomEntitySerializer<AttributionSource, AttributionSourceSchema> {


    definition(attributionSource: AttributionSource): CustomCallbackObject<AttributionSourceSchema> {
        return {
            id: () => attributionSource.id,
            name: () => attributionSource.name,
            url: () => attributionSource.url,
            logoUrl: () => attributionSource.logoUrl
        };
    }

}

export const attributionSourceSerializer = new AttributionSourceSerializer();
