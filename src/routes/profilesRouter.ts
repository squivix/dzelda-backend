import {FastifyPluginCallback} from "fastify/types/plugin.js";
import {profileController} from "@/src/controllers/ProfileController.js";

const profileRouter: FastifyPluginCallback = function (fastify, options, done) {
    fastify.get(`/users/:username/profile/`, profileController.getProfile);
    done();
};

export default profileRouter;