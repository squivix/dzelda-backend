import {FastifyPluginCallback} from "fastify/types/plugin.js";
import CourseController from "@/src/controllers/CourseController.js";
import {requiresAuth} from "@/src/middlewares/authMiddleware.js";
import {deleteFileOnFail, parseMultiPartJSON, uploadMiddleWare} from "@/src/middlewares/fileUploadMiddleWare.js";

export const coursesRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/courses/`, CourseController.getCourses);

    fastify.post(`/courses/`, {
        preHandler: [requiresAuth, uploadMiddleWare({
            "image": {
                path: "public/media/courses/images",
                type: "image"
            }
        }), parseMultiPartJSON],
        handler: CourseController.createCourse,
        onResponse: deleteFileOnFail
    });
    done();
};