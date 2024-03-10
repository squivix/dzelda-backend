import {z} from "zod";
import {UserService} from "@/src/services/UserService.js";
import {FastifyReply, FastifyRequest} from "fastify";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {emailValidator, passwordValidator, usernameValidator} from "@/src/validators/userValidator.js";
import {userSerializer} from "@/src/presentation/response/serializers/entities/UserSerializer.js";
import {emailTransporter} from "@/src/nodemailer.config.js";
import {APIError} from "@/src/utils/errors/APIError.js";
import {StatusCodes} from "http-status-codes";
import {profileSerializer} from "@/src/presentation/response/serializers/entities/ProfileSerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {bioValidator} from "@/src/validators/profileValidators.js";
import {createPresignedPost} from "@aws-sdk/s3-presigned-post";
import crypto from "crypto";
import {Conditions as PolicyEntry} from "@aws-sdk/s3-presigned-post/dist-types/types.js";
import {s3Client} from "@/src/storageClient.js";
import * as process from "process";
import mime from "mime-types";
import {fileFields, fileFieldsKeys, FileFieldType} from "@/src/validators/fileValidator.js";
import {validateFileObjectKey} from "@/src/controllers/ControllerUtils.js";
import {confirmEmailChangeTemplate} from "@/src/presentation/response/templates/email/confirmEmailChangeTemplate.js";
import {passwordChangedNotificationTemplate} from "@/src/presentation/response/templates/email/passwordChangedNotificationTemplate.js";
import {confirmEmailTemplate} from "@/src/presentation/response/templates/email/confirmEmailTemplate.js";
import {passwordResetTemplate} from "@/src/presentation/response/templates/email/passwordResetTemplate.js";
import urlJoin from "url-join";

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
        await emailTransporter.sendMail(confirmEmailTemplate(newUser.email, {token}));
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

        if (user.isEmailConfirmed && !user.isPendingEmailChange)
            throw new APIError(StatusCodes.BAD_REQUEST, "Email is already confirmed");

        const email = body.email ?? user.email;
        await userService.changeUserEmail(user, email);
        const token = await userService.generateEmailConfirmToken({
            user: user,
            email: email
        });
        await emailTransporter.sendMail(confirmEmailTemplate(email, {token}));
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
            throw new ValidationAPIError({newEmail: "New email address is the same as existing email address"});

        const token = await userService.generateEmailConfirmToken({
            user: user,
            email: body.newEmail
        });
        await emailTransporter.sendMail(confirmEmailChangeTemplate(body.newEmail, {token}));
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
        const pathParamsValidator = z.object({username: z.string().min(1).or(z.literal("me")),});
        const pathParams = pathParamsValidator.parse(request.params);
        const userService = new UserService(request.em);
        const user = await userService.getUser(pathParams.username, request.user);
        // private user don't exist to the outside
        if (!user || (!user.profile.isPublic && user !== request.user))
            throw new NotFoundAPIError("User");
        reply.status(200).send(userSerializer.serialize(user, {ignore: request.user !== user ? ["email", "isEmailConfirmed", "isPendingEmailChange"] : []}));
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
            await emailTransporter.sendMail(passwordResetTemplate(user.email, {token}));
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
        await emailTransporter.sendMail(passwordChangedNotificationTemplate(user.email));
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
        await emailTransporter.sendMail(passwordChangedNotificationTemplate(user.email));
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
            bio: bioValidator,
            profilePicture: z.string().optional()
        });
        const body = bodyValidator.parse(request.body);
        const userService = new UserService(request.em);
        const user = request.user as User;

        if (body.profilePicture)
            body.profilePicture = await validateFileObjectKey(userService, request.user as User, body.profilePicture, "profilePicture", "profilePicture");
        await userService.updateUserProfile(user, {bio: body.bio, profilePicture: body.profilePicture});

        reply.status(200).send(profileSerializer.serialize(user.profile));
    }

    async generateFileUploadPresignedUrl(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            fileField: z.string().refine(f => fileFieldsKeys.includes(f), {message: "Unexpected file field"}).transform(f => f as keyof FileFieldType),
            fileExtension: z.string().min(1).max(20).regex(/^\.[^.\s\x00-\x1f/\\:*?"<>|]+$/).toLowerCase(),
        });
        const body = bodyValidator.parse(request.body);
        const fieldMetaData = fileFields[body.fileField];
        if (!fieldMetaData.extensions.includes(body.fileExtension))
            throw new ValidationAPIError({fileExtension: `Unexpected file extension must be one of: ${fieldMetaData.extensions.join(", ")}`});

        const bucket = process.env.SPACES_BUCKET!;
        const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
        const objectKey = `${fieldMetaData.path}/${fileName}${body.fileExtension}`;
        const mimeType = mime.lookup(body.fileExtension) as string;
        const conditions = [
            {bucket: bucket},
            {key: objectKey},
            {"Content-Type": mimeType},
            ["content-length-range", fieldMetaData.minSize, fieldMetaData.maxSize],
        ] as PolicyEntry[];

        const {url: uploadUrl, fields: formFields} = await createPresignedPost(s3Client, {
            Bucket: bucket,
            Key: objectKey,
            Conditions: conditions,
            Fields: {
                acl: "public-read",
                "Content-Type": mimeType
            },
            Expires: 300,
        });
        const userService = new UserService(request.em);
        await userService.generateFileUploadRequest({
            user: request.user as User,
            fileField: body.fileField,
            fileUrl: urlJoin(process.env.SPACES_CDN_ENDPOINT!, objectKey),
            objectKey: objectKey
        });

        reply.status(200).send({
            uploadUrl: uploadUrl,
            uploadFormFields: formFields,
            objectKey: objectKey
        });
    }
}

export const userController = new UserController();
