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
        const courses = await courseService.getCourses(filters, request.user);
        reply.send(courses);
    }
}

export default new CourseController();