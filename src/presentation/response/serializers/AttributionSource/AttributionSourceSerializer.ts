import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {AttributionSourceFetchSpecsType} from "@/src/models/fetchSpecs/attributionSourceFetchSpecs.js";


class AttributionSourceSerializer extends CustomSerializer<AttributionSource> {
    readonly view: ViewDescriptionFromSpec<AttributionSource, AttributionSourceFetchSpecsType> = {
        fields: ["id", "name", "url", "logoUrl"]
    }

    serialize(attributionSource: AttributionSource, {assertNoUndefined = true} = {}) {
        return this.finalizePojo({
            id: attributionSource.id,
            name: attributionSource.name,
            url: attributionSource.url,
            logoUrl: attributionSource.logoUrl
        }, assertNoUndefined);
    }
}

export const attributionSourceSerializer = new AttributionSourceSerializer();
