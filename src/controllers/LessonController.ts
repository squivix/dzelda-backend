import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import LessonService from "@/src/services/LessonService.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";

class LessonController {
    async getLessons(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({});

        const queryParams = validator.parse(request.query);
        const lessonService = new LessonService(request.em);

        const filters = {};
        const lessons = await lessonService.getLessons(filters, request.user);
        reply.send(lessons);
    }
}

export default new LessonController();