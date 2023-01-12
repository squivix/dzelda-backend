import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import CourseService from "@/src/services/CourseService";

class CourseController {
    async getCourses(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({});

        const queryParams = validator.parse(request.query);
        const courseService = new CourseService(request.em);

        const filters = {};

        const languages = await courseService.getCourses(filters);
        reply.send(languages);
    }
}

export default new CourseController();