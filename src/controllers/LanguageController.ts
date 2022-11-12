import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import LanguageService from "@/src/services/LanguageService.js";

class LanguageController {

    async getLanguages(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            isSupported: z.string().regex(/(true|false)/ig).transform(v => v.toLowerCase() == "true").optional()
        });

        const queryParams = validator.parse(request.query);
        const languageService = new LanguageService(request.em);

        const filters = {isSupported: queryParams.isSupported};
        const languages = await languageService.getLanguages(filters);
        reply.send(languages);
    }
}

export default new LanguageController();