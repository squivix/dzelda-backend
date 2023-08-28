import {z} from "zod";
import {UserService} from "@/src/services/UserService.js";
import {FastifyReply, FastifyRequest} from "fastify";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {passwordValidator, usernameValidator} from "@/src/validators/userValidator.js";
import {userSerializer} from "@/src/presentation/response/serializers/entities/UserSerializer.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {emailTransporter} from "@/src/nodemailer.config.js";
import {DOMAIN_NAME} from "@/src/constants.js";
import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";

class UserController {

    async signUp(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            email: z.string().max(256).email(),
            username: usernameValidator,
            password: passwordValidator,
            initialLanguage: languageCodeValidator.optional()
        }).strict();
        const body = validator.parse(request.body);
        const userService = new UserService(request.em);
        const newUser = await userService.createUser(body.username, body.email, body.password, body.initialLanguage);

        reply.status(201).send(userSerializer.serialize(newUser, {ignore: ["profile"]}));
    }

    async login(request: FastifyRequest, reply: FastifyReply) {
        const validator = z.object({
            username: usernameValidator,
            password: z.string().min(8),
        }).strict();
        const body = validator.parse(request.body);
        const userService = new UserService(request.em);
        const token = await userService.authenticateUser(body.username, body.password);

        reply.status(201).send({authToken: token});
    }

    async logout(request: FastifyRequest, reply: FastifyReply) {
        const userService = new UserService(request.em);
        await userService.deleteSession(request.session!);

        reply.status(204).send();
    }

    async getUser(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({username: usernameValidator.or(z.literal("me")),});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        // private user don't exist to the outside
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        reply.status(200).send(userSerializer.serialize(user, {ignore: request.user !== user ? ["email"] : []}));
    }

    async createPasswordResetToken(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            username: z.string(),
            email: z.string().max(256).email(),
        });
        const body = bodyValidator.parse(request.body);
        const userService = new UserService(request.em);
        const user = await userService.findUser({username: body.username, email: body.email});
        if (user != null) {
            const token = await userService.generatePasswordResetToken(user);
            await emailTransporter.sendMail({
                from: `Dzelda <security@${DOMAIN_NAME}>`,
                to: user.email,
                subject: "Password Reset Link",
                text: `Password Reset Here: https://${DOMAIN_NAME}/reset-password?token=${token}`,
                html: `<b>Password Reset Here: https://${DOMAIN_NAME}/reset-password?token=${token}</b>`,
            });
        }
        reply.status(204).send();     // do not disclose whether user exists or not
    }

    async validatePasswordResetToken(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({token: z.string()});
        const body = bodyValidator.parse(request.body);
        const userService = new UserService(request.em);
        const token = await userService.verifyPasswordResetToken(body.token);
        if (token == null)
            throw new APIError(StatusCodes.UNAUTHORIZED, "Password reset token is invalid or expired");
        reply.status(204).send();
    }

    async resetPassword(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            token: z.string(),
            newPassword: passwordValidator,
        });

        const body = bodyValidator.parse(request.body);

        const userService = new UserService(request.em);
        const user = await userService.resetPassword(body.token, body.newPassword);
        if (user === null)
            throw new APIError(StatusCodes.UNAUTHORIZED, "Password reset token is invalid or expired");
        await emailTransporter.sendMail({
            from: `Dzelda <security@${DOMAIN_NAME}>`,
            to: user.email,
            subject: "Your password was changed",
            text: `Your password was recently changed. If this wasn't you please reset it here: https://${DOMAIN_NAME}/forgot-password/`,
            html: `<b>Your password was recently changed. If this wasn't you please reset it here: https://${DOMAIN_NAME}/forgot-password/</b>`,
        });
        reply.status(204).send();
    }

    // async updatePassword(request: FastifyRequest, reply: FastifyReply) {
    // }

}

export const userController = new UserController();
