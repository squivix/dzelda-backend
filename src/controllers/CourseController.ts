import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import CourseService from "@/src/services/CourseService.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";

class CourseController {
    async getCourses(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({});

        const queryParams = validator.parse(request.query);
        const courseService = new CourseService(request.em);

        const filters = {};
        if (!request.user || request.user instanceof AnonymousUser) {
            reply.status(401).send();
            return;
        }
        const courses = await courseService.getCourses(filters, request.user.id);
        reply.send(courses);
    }
}

export default new CourseController();