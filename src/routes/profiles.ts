import {FastifyPluginCallback} from "fastify/types/plugin.js";
import ProfileController from "../controllers/ProfileController.js";

const profileRouter: FastifyPluginCallback = function rootRouter(fastify, options, done) {
    fastify.get(`/users/:username/profile/`, ProfileController.getProfile);
    done();
};

export default profileRouter;