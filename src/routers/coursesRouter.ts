import {FastifyPluginCallback} from "fastify/types/plugin.js";
import CourseController from "@/src/controllers/CourseController.js";
import {requiresAuth} from "@/src/middlewares/authMiddleware.js";
import {deleteFileOnFail, fileUploadMiddleware} from "@/src/middlewares/fileUploadMiddleware.js";
import {courseImageValidator} from "@/src/validators/courseValidator.js";

export const coursesRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/courses/`, CourseController.getCourses);
    fastify.post(`/courses/`, {
        preHandler: [requiresAuth,
            fileUploadMiddleware({"image": {path: "courses/images", validate: courseImageValidator}})],
        handler: CourseController.createCourse,
        onResponse: deleteFileOnFail
    });

    fastify.get(`/courses/:courseId/`, CourseController.getCourse);

    fastify.put(`/courses/:courseId/`, {
        preHandler: [requiresAuth,
            fileUploadMiddleware({"image": {path: "courses/images", validate: courseImageValidator}})],
        handler: CourseController.updateCourse,
        onResponse: deleteFileOnFail
    });

    fastify.get(`/users/:username/courses/`, {preHandler: requiresAuth, handler: CourseController.getUserCoursesLearning});
    done();
};
