import {z} from "zod";
import {UserService} from "@/src/services/UserService.js";
import {FastifyReply, FastifyRequest} from "fastify";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {emailValidator, passwordValidator, usernameValidator} from "@/src/validators/userValidator.js";
import {userSerializer} from "@/src/presentation/response/serializers/entities/UserSerializer.js";
import {emailTransporter} from "@/src/nodemailer.config.js";
import {DOMAIN_NAME} from "@/src/constants.js";
import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {profileSerializer} from "@/src/presentation/response/serializers/entities/ProfileSerializer.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {User} from "@/src/models/entities/auth/User.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {bioValidator} from "@/src/validators/profileValidators.js";

class UserController {
    async signUp(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            email: emailValidator,
            username: usernameValidator,
            password: passwordValidator
        }).strict();
        const body = bodyValidator.parse(request.body);
        const userService = new UserService(request.em);
        const newUser = await userService.createUser(body.username, body.email, body.password);
        const token = await userService.generateEmailConfirmToken({user: newUser, email: newUser.email});
        await emailTransporter.sendMail({
            from: `Dzelda <security@${DOMAIN_NAME}>`,
            to: newUser.email,
            subject: "Confirm Email",
            text: `Confirm Email Here: https://${DOMAIN_NAME}/confirm-email?token=${token}`,
            html: `<b>Confirm Email Here: https://${DOMAIN_NAME}/confirm-email?token=${token}</b>`,
        });
        reply.status(201).send(userSerializer.serialize(newUser, {ignore: ["profile"]}));
    }

    async login(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            username: z.string(),
            password: z.string(),
        }).strict();
        const body = bodyValidator.parse(request.body);
        const userService = new UserService(request.em);
        const token = await userService.authenticateUser(body.username, body.password);

        reply.status(201).send({authToken: token});
    }

    async logout(request: FastifyRequest, reply: FastifyReply) {
        const userService = new UserService(request.em);
        await userService.deleteLoginSession(request.session!);

        reply.status(204).send();
    }

    async requestEmailConfirmation(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            email: emailValidator.optional(),
        }).default({email: undefined});
        const body = bodyValidator.parse(request.body);

        const userService = new UserService(request.em);
        const user = request.user as User;

        if (user.isEmailConfirmed)
            throw new APIError(StatusCodes.BAD_REQUEST, "Email is already confirmed");

        const email = body.email ?? user.email;
        await userService.changeUserEmail(user, email);
        const token = await userService.generateEmailConfirmToken({
            user: user,
            email: email
        });
        await emailTransporter.sendMail({
            from: `Dzelda <security@${DOMAIN_NAME}>`,
            to: email,
            subject: "Confirm Email",
            text: `Confirm Email Here: https://${DOMAIN_NAME}/confirm-email?token=${token}`,
            html: `<b>Confirm Email Here: https://${DOMAIN_NAME}/confirm-email?token=${token}</b>`,
        });
        reply.status(204).send();
    }

    async changeUserEmail(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            newEmail: emailValidator,
        });
        const body = bodyValidator.parse(request.body);

        const userService = new UserService(request.em);
        const user = request.user as User;

        if (user.email == body.newEmail)
            throw new ValidationAPIError({email: "same as existing email address"});

        const token = await userService.generateEmailConfirmToken({
            user: user,
            email: body.newEmail
        });
        await emailTransporter.sendMail({
            from: `Dzelda <security@${DOMAIN_NAME}>`,
            to: body.newEmail,
            subject: "Confirm New Email",
            text: `Confirm New Email Here: https://${DOMAIN_NAME}/confirm-email?token=${token}`,
            html: `<b>Confirm New Email Here: https://${DOMAIN_NAME}/confirm-email?token=${token}</b>`,
        });
        reply.status(204).send();
    }

    async confirmEmail(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({token: z.string()});
        const body = bodyValidator.parse(request.body);
        const userService = new UserService(request.em);
        const token = await userService.confirmUserEmail(body.token);
        if (token == null)
            throw new APIError(StatusCodes.UNAUTHORIZED, "Email confirmation token is invalid or expired");

        reply.status(204);
    }

    async getUser(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({username: usernameValidator.or(z.literal("me")),});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        // private user don't exist to the outside
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        reply.status(200).send(userSerializer.serialize(user, {ignore: request.user !== user ? ["email", "isEmailConfirmed"] : []}));
    }

    async requestPasswordReset(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            username: z.string(),
            email: z.string().max(256).email(),
        });
        const body = bodyValidator.parse(request.body);
        const userService = new UserService(request.em);
        const user = await userService.findUser({username: body.username, email: body.email, isEmailConfirmed: true});
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

    async verifyPasswordResetToken(request: FastifyRequest, reply: FastifyReply) {
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

    async changeUserPassword(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            oldPassword: z.string(),
            newPassword: passwordValidator
        });
        const body = bodyValidator.parse(request.body);
        const userService = new UserService(request.em);
        const session = request.session as Session;
        const user = request.user as User;

        await userService.changeUserPassword(user, session, body.oldPassword, body.newPassword);
        await emailTransporter.sendMail({
            from: `Dzelda <security@${DOMAIN_NAME}>`,
            to: user.email,
            subject: "Your password was changed",
            text: `Your password was recently changed. If this wasn't you please reset it here: https://${DOMAIN_NAME}/forgot-password/`,
            html: `<b>Your password was recently changed. If this wasn't you please reset it here: https://${DOMAIN_NAME}/forgot-password/</b>`,
        });
        reply.status(204).send();
    }

    async deleteAccount(request: FastifyRequest, reply: FastifyReply) {
        const userService = new UserService(request.em);
        const user = request.user as User;
        await userService.deleteUserAccount(user);
        reply.status(204).send();
    }

    async updateUserProfile(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            data: z.object({
                bio: bioValidator
            }),
            profilePicture: z.string().optional()
        });
        const body = bodyValidator.parse(request.body);
        const userService = new UserService(request.em);
        const user = request.user as User;

        await userService.updateUserProfile(user, {bio: body.data.bio, profilePicture: body.profilePicture});

        reply.status(200).send(profileSerializer.serialize(user.profile));
    }
}

export const userController = new UserController();
