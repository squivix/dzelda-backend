import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {numericStringValidator} from "@/src/validators/utilValidators.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {attributionSourceSerializer} from "@/src/presentation/response/serializers/AttributionSource/AttributionSourceSerializer.js";
import {AttributionService} from "@/src/services/AttributionService.js";

class AttributionController {
    async getAttributionSource(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({attributionSourcesId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const serializer = attributionSourceSerializer

        const attributionService = new AttributionService(request.em);
        const attributionSource = await attributionService.getAttributionSource(pathParams.attributionSourcesId, serializer.view);
        if (!attributionSource)
            throw new NotFoundAPIError("Attribution source");

        reply.send(serializer.serialize(attributionSource));
    }
}

export const attributionController = new AttributionController();
