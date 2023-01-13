import {FastifyPluginCallback} from "fastify/types/plugin.js";
import CourseController from "@/src/controllers/CourseController.js";

const coursesRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/courses/`, CourseController.getCourses);
    done();
};

export default coursesRouter;