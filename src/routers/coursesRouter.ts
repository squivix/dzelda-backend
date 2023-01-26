import {FastifyPluginCallback} from "fastify/types/plugin.js";
import CourseController from "@/src/controllers/CourseController.js";
import {requiresAuth} from "@/src/middlewares/authMiddleware.js";
import {deleteFileOnFail, uploadMiddleWares} from "@/src/middlewares/fileUploadMiddleWare.js";

export const coursesRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/courses/`, CourseController.getCourses);

    fastify.post(`/courses/`, {
        preHandler: [requiresAuth,
            ...uploadMiddleWares({"image": {path: "public/media/courses/images", type: "image", maxSize: 500 * 1024}})],
        handler: CourseController.createCourse,
        onResponse: deleteFileOnFail
    });

    fastify.get(`/courses/:courseId`, CourseController.getCourse);
    done();
};