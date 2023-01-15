import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {profileController} from "@/src/controllers/ProfileController.js";

export const profileRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/users/:username/profile/`, profileController.getProfile);
    done();
};