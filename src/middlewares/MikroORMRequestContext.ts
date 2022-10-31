import {orm} from "../app.js";
import {FastifyInstance} from "fastify";
import {FastifyPluginCallback} from "fastify/types/plugin.js";

const MikroORMRequestContext: FastifyPluginCallback =
    function (fastify: FastifyInstance, options: Object, done) {
        fastify.addHook("onRequest", (request, reply, onRequestDone) => {
            request.em = orm.em.fork();
        });
        done();
    };
export default MikroORMRequestContext;