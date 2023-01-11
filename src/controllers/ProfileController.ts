import {z} from "zod";
import {FastifyReply, FastifyRequest} from "fastify";
import UserService from "@/src/services/UserService.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {User} from "@/src/models/entities/auth/User.js";

type CustomFastifyRequest = FastifyRequest<{
    //path paramas
    Params: { username: string }
}>

class ProfileController {
    async getProfile(request: CustomFastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            username: z.string().min(4).max(20).regex(/^[A-Za-z0-9]*$/).or(z.literal("me"))
        });
        const pathParams = validator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        // private user don't exist to the outside
        if (!user.profile.isPublic && user !== request.user)
            throw new NotFoundAPIError("User");
        else
            reply.status(200).send(user.profile);
    }
}

export const profileController = new ProfileController();