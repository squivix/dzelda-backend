import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {PronunciationService} from "@/src/services/PronunciationService.js";
import {humanPronunciationSerializer} from "@/src/presentation/response/serializers/entities/HumanPronunciationSerializer.js";

class PronunciationController {
    async getHumanPronunciations(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            text: z.string().min(1).optional(),
            languageCode: languageCodeValidator.optional(),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
        });
        const queryParams = queryParamsValidator.parse(request.query);

        const filters = {
            languageCode: queryParams.languageCode,
            text: queryParams.text
        };
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const pronunciationService = new PronunciationService(request.em);
        const [humanPronunciations, recordsCount] = await pronunciationService.getPaginatedHumanPronunciations(filters, pagination);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: humanPronunciationSerializer.serializeList(humanPronunciations)
        });
    }
}

export const pronunciationController = new PronunciationController();
