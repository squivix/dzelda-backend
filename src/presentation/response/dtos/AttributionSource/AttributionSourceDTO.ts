import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";

class AttributionSourceDTO extends CustomDTO<AttributionSource> {
    serialize(attributionSource: AttributionSource) {
        return {
            id: attributionSource.id,
            name: attributionSource.name,
            url: attributionSource.url,
            logoUrl: attributionSource.logoUrl
        }
    }
}

export const attributionSourceDTO = new AttributionSourceDTO();