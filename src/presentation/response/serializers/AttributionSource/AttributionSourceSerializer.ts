import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class AttributionSourceSerializer extends CustomSerializer<AttributionSource> {
    serialize(attributionSource: AttributionSource, {assertNoUndefined = true} = {}) {
        const pojo = {
            id: attributionSource.id,
            name: attributionSource.name,
            url: attributionSource.url,
            logoUrl: attributionSource.logoUrl
        }
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const attributionSourceSerializer = new AttributionSourceSerializer();