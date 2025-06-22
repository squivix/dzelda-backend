import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";

class AttributionSourceSerializer extends CustomSerializer<AttributionSource> {
    serialize(attributionSource: AttributionSource) {
        return {
            id: attributionSource.id,
            name: attributionSource.name,
            url: attributionSource.url,
            logoUrl: attributionSource.logoUrl
        }
    }
}

export const attributionSourceSerializer = new AttributionSourceSerializer();