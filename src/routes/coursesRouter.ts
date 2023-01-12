import {FastifyPluginCallback} from "fastify/types/plugin.js";
import CourseController from "@/src/controllers/CourseController";

const coursesRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.get(`/courses/`, CourseController.getCourses);
    done();
};

export default coursesRouter;