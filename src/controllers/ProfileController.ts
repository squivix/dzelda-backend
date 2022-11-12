import {z} from "zod";
import UserService from "../services/UserService.js";
import {FastifyReply, FastifyRequest} from "fastify";
import {NotFoundAPIError} from "../utils/errors/NotFoundAPIError.js";

type CustomFastifyRequest = FastifyRequest<{
    //path paramas
    Params: { username: string }
}>

class ProfileController {
    async getProfile(request: CustomFastifyRequest, reply: FastifyReply) {
        const validator = z.object({username: z.string().min(4).max(20).regex(/^[A-Za-z0-9]*$/).or(z.literal("me"))});
        const parsedPathParams = validator.safeParse(request.params);

        if (!parsedPathParams.success)
            throw new NotFoundAPIError("Profile");

        const pathParams = parsedPathParams.data;
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username);

        // private profiles don't exist to the outside
        if (!user.profile.isPublic && user !== request.user)
            throw new NotFoundAPIError("Profile");
        else
            reply.status(200).send(user.profile);
    }
}

export default new ProfileController();