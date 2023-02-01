import {FastifyPluginCallback} from "fastify/types/plugin.js";
import CourseController from "@/src/controllers/CourseController.js";
import {FastifyFormidable} from "fastify-formidable";
import {requiresAuth} from "@/src/middlewares/authMiddleware.js";
import {deleteFileOnFail, singleFileUploadMiddleWare} from "@/src/middlewares/fileUploadMiddleWare.js";
import {courseImageValidator} from "@/src/validators/courseValidator.js";

export const coursesRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.register(FastifyFormidable)


    fastify.get(`/courses/`, CourseController.getCourses);
    // 500 * 1024
    fastify.post(`/courses/`, {
        preHandler: [requiresAuth,
            singleFileUploadMiddleWare({"image": {path: "courses/images", validate: courseImageValidator}})],
        handler: CourseController.createCourse,
        onResponse: deleteFileOnFail
    });

    fastify.get(`/courses/:courseId`, CourseController.getCourse);

    fastify.put(`/courses/:courseId`, {
        preHandler: [requiresAuth,
            singleFileUploadMiddleWare({"image": {path: "courses/images", validate: courseImageValidator}})],
        handler: CourseController.updateCourse,
        onResponse: deleteFileOnFail
    });
    done();
};