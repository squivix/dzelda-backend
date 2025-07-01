import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {TextService} from "@/src/services/TextService.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";
import {booleanStringValidator, numericStringValidator} from "@/src/validators/utilValidators.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {CollectionService} from "@/src/services/CollectionService.js";
import {textContentValidator, textLevelValidator, textTitleValidator} from "@/src/validators/textValidators.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {API_ROOT} from "@/src/server.js";
import {UserService} from "@/src/services/UserService.js";
import {validateFileObjectKey} from "@/src/controllers/controllerUtils.js";
import {collectionLevelsFilterValidator} from "@/src/validators/collectionValidator.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {APIError} from "@/src/utils/errors/APIError.js";
import {emailTransporter} from "@/src/nodemailer.config.js";
import {DOMAIN_NAME} from "@/src/constants.js";
import {textSerializer} from "@/src/presentation/response/serializers/Text/TextSerializer.js";
import {textHistoryEntrySerializer} from "@/src/presentation/response/serializers/TextHistoryEntry/TextHistoryEntrySerializer.js";
import {textLoggedInSerializer} from "@/src/presentation/response/serializers/Text/TextLoggedInSerializer.js";
import {textVisibilityFilter} from "@/src/filters/textVisibilityFilter.js";
import {collectionVisibilityFilter} from "@/src/filters/collectionVisibilityFilter.js";

class TextController {
    async getTexts(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: z.string().min(1).or(z.literal("me")).optional(),
            searchQuery: z.string().max(256).optional(),
            level: collectionLevelsFilterValidator.default([]),
            hasAudio: booleanStringValidator.optional(),
            sortBy: z.union([z.literal("title"), z.literal("createdDate"), z.literal("pastViewersCount")]).optional().default("title"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        if (queryParams.addedBy == "me") {
            if (!request.user || request.user instanceof AnonymousUser)
                throw new UnauthenticatedAPIError(request.user);
            queryParams.addedBy = request.user?.username;
        }
        const serializer = request.isLoggedIn ? textLoggedInSerializer : textSerializer;

        const filters = {
            languageCode: queryParams.languageCode,
            addedBy: queryParams.addedBy,
            searchQuery: queryParams.searchQuery,
            level: queryParams.level,
            hasAudio: queryParams.hasAudio,
        };
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const textService = new TextService(request.em);
        const [texts, recordsCount] = await textService.getPaginatedTexts(filters, sort, pagination, request.user, serializer.view);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: serializer.serializeList(texts)
        });
    }

    //TODO be consistent with error code for not found in body
    async createText(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            languageCode: languageCodeValidator,
            title: textTitleValidator,
            content: textContentValidator,
            isPublic: z.boolean().optional().default(true),
            level: textLevelValidator.optional(),
            collectionId: z.number().min(0).or(z.literal(null)).optional().default(null),
            image: z.string().optional(),
            audio: z.string().optional(),
        });
        const body = bodyValidator.parse(request.body);
        const user = request.user as User;
        const serializer = textLoggedInSerializer;

        const collectionService = new CollectionService(request.em);
        const languageService = new LanguageService(request.em);
        const language = await languageService.findLearningLanguage({code: body.languageCode});
        if (!language)
            throw new NotFoundAPIError("Language");
        let collection: Collection | null = null;
        if (body.collectionId) {
            collection = await collectionService.findCollection(body.collectionId);
            if (!collection)
                throw new ValidationAPIError({collection: "Not found"});
            if (collection.language !== language)
                throw new ValidationAPIError({collection: "Not in the same language as text"});
            if (collection.addedBy !== user.profile)
                throw new ForbiddenAPIError("User is not author of collection");
        }
        const userService = new UserService(request.em);
        if (body.image)
            body.image = await validateFileObjectKey(userService, request.user as User, body.image, "textImage", "image");
        if (body.audio)
            body.audio = await validateFileObjectKey(userService, request.user as User, body.audio, "textAudio", "audio");

        const textService = new TextService(request.em);
        let newText = await textService.createText({
            title: body.title,
            content: body.content,
            language: language,
            isPublic: body.isPublic,
            level: body.level,
            collection: collection,
            image: body.image,
            audio: body.audio,
            orderInCollection: collection == null ? null : collection.textsCount,
        }, user, {parsingPriority: 2});

        newText = await textService.getText(newText.id, user, serializer.view);
        reply.status(201).send(serializer.serialize(newText));
    }

    async getText(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({textId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const serializer = request.isLoggedIn ? textLoggedInSerializer : textSerializer;
        const textService = new TextService(request.em);
        const text = await textService.getText(pathParams.textId, request.user, serializer.view);

        if (!text)
            throw new NotFoundAPIError("Text");
        reply.status(200).send(serializer.serialize(text));
    }

    async updateText(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({textId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);

        const bodyValidator = z.object({
            collectionId: z.number().min(0).optional().or(z.literal(null)),
            title: textTitleValidator,
            content: textContentValidator,
            isPublic: z.boolean().optional(),
            level: textLevelValidator.optional(),
            image: z.string().optional(),
            audio: z.string().optional(),
        });
        const body = bodyValidator.parse(request.body);
        const user = request.user as User
        const serializer = textLoggedInSerializer;

        const textService = new TextService(request.em);
        const text = await textService.findText({$and: [{id: pathParams.textId}, textVisibilityFilter(user)]});
        if (!text)
            throw new NotFoundAPIError("Text");
        if (user.profile !== text.addedBy)
            throw new ForbiddenAPIError();

        const collectionService = new CollectionService(request.em);
        let newCollection: Collection | null | undefined;
        if (body.collectionId === null)
            newCollection = null;
        else if (body.collectionId) {
            newCollection = await collectionService.findCollection(body.collectionId);
            if (!newCollection)
                throw new ValidationAPIError({collection: "Not found"});
            if (request?.user?.profile !== newCollection.addedBy)
                throw new ForbiddenAPIError() ;
            if (newCollection.language !== text.language)
                throw new ValidationAPIError({collection: "Cannot move text to a collection in a different language"});
        }

        const userService = new UserService(request.em);
        if (body.image)
            body.image = await validateFileObjectKey(userService, request.user as User, body.image, "textImage", "image");
        if (body.audio)
            body.audio = await validateFileObjectKey(userService, request.user as User, body.audio, "textAudio", "audio");
        await textService.updateText(text, {
            collection: newCollection,
            title: body.title,
            content: body.content,
            level: body.level,
            isPublic: body.isPublic,
            image: body.image,
            audio: body.audio
        }, request.user as User);
        const updatedText = await textService.getText(pathParams.textId, request.user, serializer.view);
        reply.status(200).send(serializer.serialize(updatedText));
    }

    async deleteText(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({textId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const user = request.user as User;

        const textService = new TextService(request.em);
        const text = await textService.findText({$and: [{id: pathParams.textId}, textVisibilityFilter(user)]});

        if (!text)
            throw new NotFoundAPIError("Text");
        if (text.addedBy !== user.profile)
            throw new ForbiddenAPIError("User is not authorized to delete text");
        await textService.deleteText(text);
        reply.status(204).send();
    }

    //TODO show deleted and privated texts as deleted and privated texts instead of hiding them. Do this with bookmarked collections as well
    async getUserTextsHistory(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: z.string().min(1).or(z.literal("me")).optional(),
            searchQuery: z.string().max(256).optional(),
            level: collectionLevelsFilterValidator.default([]),
            hasAudio: booleanStringValidator.optional(),
            sortBy: z.union([z.literal("timeViewed"), z.literal("title"), z.literal("createdDate"), z.literal("pastViewersCount")]).optional().default("title"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        if (queryParams.addedBy == "me")
            queryParams.addedBy = request.user?.username!;
        const serializer = textHistoryEntrySerializer;

        const filters = {
            languageCode: queryParams.languageCode,
            addedBy: queryParams.addedBy,
            searchQuery: queryParams.searchQuery,
            level: queryParams.level,
            hasAudio: queryParams.hasAudio,
        };
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const textService = new TextService(request.em);
        const [textHistoryEntries, recordsCount] = await textService.getPaginatedTextHistory(filters, sort, pagination, user, serializer.view);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: serializer.serializeList(textHistoryEntries)
        });
    }

    async addTextToUserHistory(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;

        const bodyValidator = z.object({textId: z.number().min(0)});
        const body = bodyValidator.parse(request.body);
        const serializer = textHistoryEntrySerializer;

        const textService = new TextService(request.em);
        const text = await textService.findText({$and: [{id: body.textId}, textVisibilityFilter(user)]});
        if (!text)
            throw new ValidationAPIError({text: "Not found"});
        // TODO: explicitly fetch request.user.profile.languagesLearning instead of populating in middleware
        if (!user.profile.languagesLearning.contains(text.language))
            throw new ValidationAPIError({text: "not in a language the user is learning"});
        const latestHistoryEntry = await textService.getLatestTextHistoryEntry(user, textHistoryEntrySerializer.view);

        if (latestHistoryEntry && latestHistoryEntry.text == text) {
            reply.status(200).send(serializer.serialize(latestHistoryEntry));
            return;
        }
        let newTextHistoryEntry = await textService.addTextToUserHistory(text, user);
        newTextHistoryEntry = await textService.getTextHistoryEntry(newTextHistoryEntry.id, user, textHistoryEntrySerializer.view)
        reply.status(201).send(serializer.serialize(newTextHistoryEntry));
    }

    async getNextTextInCollection(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({collectionId: numericStringValidator, textId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);

        const collectionService = new CollectionService(request.em);
        const collection = await collectionService.findCollection({$and: [{id: pathParams.collectionId}, collectionVisibilityFilter(request.user)]});

        if (!collection)
            throw new NotFoundAPIError("Collection");
        const nextText = await collectionService.findNextTextInCollection(collection, pathParams.textId, request.user);
        if (!nextText)
            throw new NotFoundAPIError("Next text");

        reply.header("Location", `${API_ROOT}/texts/${nextText.id}/`).status(303).send();
    }

    async getUserBookmarkedTexts(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: z.string().min(1).or(z.literal("me")).optional(),
            searchQuery: z.string().max(256).optional(),
            level: collectionLevelsFilterValidator.default([]),
            hasAudio: booleanStringValidator.optional(),
            sortBy: z.union([z.literal("title"), z.literal("createdDate"), z.literal("pastViewersCount")]).optional().default("title"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        const user = request.user as User;
        if (queryParams.addedBy == "me")
            queryParams.addedBy = user.username;
        const serializer = textLoggedInSerializer;

        const filters = {
            languageCode: queryParams.languageCode,
            addedBy: queryParams.addedBy,
            searchQuery: queryParams.searchQuery,
            level: queryParams.level,
            hasAudio: queryParams.hasAudio,
            isBookmarked: true,
        };
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const textService = new TextService(request.em);
        const [texts, recordsCount] = await textService.getPaginatedTexts(filters, sort, pagination, user, serializer.view);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: serializer.serializeList(texts)
        });
    }

    async addTextToUserBookmarks(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({textId: z.number().min(0)});
        const body = bodyValidator.parse(request.body);
        const user = request.user as User;
        const serializer = textLoggedInSerializer

        const textService = new TextService(request.em);
        let text = await textService.findText({$and: [{id: body.textId}, textVisibilityFilter(user)]});
        if (!text)
            throw new ValidationAPIError({text: "Not found"});
        if (!user.profile.languagesLearning.contains(text.language))
            throw new ValidationAPIError({text: "not in a language the user is learning"});
        const textBookmark = await textService.addTextToUserBookmarks(text, user);
        text = await textService.getText(textBookmark.text.id, user, serializer.view)
        reply.status(201).send(serializer.serialize(text));
    }

    async removeTextFromUserBookmarks(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({textId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);

        const textService = new TextService(request.em);
        const text = await textService.findText({$and: [{id: pathParams.textId}, textVisibilityFilter(user)]});
        if (!text)
            throw new NotFoundAPIError("Text");
        const bookmark = await textService.findTextBookmark({text: text, bookmarker: user.profile});
        if (!bookmark)
            throw new APIError(404, "Text is not bookmarked");
        await textService.removeTextFromUserBookmarks(text, user);
        reply.status(204).send();
    }

    async getUserHiddenTexts(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: z.string().min(1).or(z.literal("me")).optional(),
            searchQuery: z.string().max(256).optional(),
            level: collectionLevelsFilterValidator.default([]),
            hasAudio: booleanStringValidator.optional(),
            sortBy: z.union([z.literal("title"), z.literal("createdDate"), z.literal("pastViewersCount")]).optional().default("title"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        const user = request.user as User;
        if (queryParams.addedBy == "me")
            throw new ValidationAPIError({addedBy: "You cannot hide texts you created"})
        const serializer = textLoggedInSerializer;

        const filters = {
            languageCode: queryParams.languageCode,
            addedBy: queryParams.addedBy,
            searchQuery: queryParams.searchQuery,
            level: queryParams.level,
            hasAudio: queryParams.hasAudio,
            isHiddenByUser: true,
        };
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const textService = new TextService(request.em);
        const [texts, recordsCount] = await textService.getPaginatedTexts(filters, sort, pagination, user, serializer.view);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: serializer.serializeList(texts)
        });
    }

    async hideTextForUser(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const bodyValidator = z.object({textId: z.number().min(0)});
        const body = bodyValidator.parse(request.body);

        const textService = new TextService(request.em);
        const text = await textService.findText({id: body.textId});
        if (!text)
            throw new NotFoundAPIError("Text");
        if (text.addedBy === user.profile)
            throw new APIError(400, "You cannot hide texts you created");

        const existingMapping = await textService.findHiderTextMapping({hider: user.profile, text: text});
        if (existingMapping)
            throw new APIError(400, "Text is already hidden by user");
        await textService.hideTextForUser(text, user);
        reply.status(204).send();
    }

    async unhideTextForUser(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({textId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const textService = new TextService(request.em);
        const text = await textService.findText({id: pathParams.textId});
        if (!text)
            throw new NotFoundAPIError("Text");
        const mapping = await textService.findHiderTextMapping({hider: user.profile, text: text});
        if (!mapping)
            throw new APIError(404, "Text is not hidden by user");
        await textService.unhideTextForUser(text, user);
        reply.status(204).send();
    }

    async reportText(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({textId: numericStringValidator});
        const bodyValidator = z.object({
            reasonForReporting: z.string().min(1).max(512),
            reportText: z.string().min(0).max(5000).optional(),
            hideText: z.boolean().optional().default(true)
        });
        const pathParams = pathParamsValidator.parse(request.params);
        const body = bodyValidator.parse(request.body);

        const textService = new TextService(request.em);
        const text = await textService.findText({id: pathParams.textId});
        if (!text)
            throw new NotFoundAPIError("Text");
        const existingReport = await textService.findFlaggedTextReport({reporter: user.profile, text: text});
        if (existingReport)
            throw new APIError(400, "Text is already flagged by user");
        const newReport = await textService.createFlaggedTextReport({text, reportingUser: user, reasonForReporting: body.reasonForReporting, reportText: body.reportText});
        if (body.hideText)
            await textService.hideTextForUser(text, user, true);

        if (!user.isAdmin) {
            const userService = new UserService(request.em);
            const admin = await userService.findUser({isAdmin: true});
            if (admin) {
                const populatedText = await textService.getText(text.id, user, {fields: ["id", "title"], relations: {language: {fields: ["code"]}}})
                await emailTransporter.sendMail({
                    from: `Dzelda <noreply@${DOMAIN_NAME}>`,
                    to: admin.email,
                    subject: `A text was flagged`,
                    text: `A text was reported. Please review and approve or reject hiding this text.\n\nText id: ${populatedText.id}\nText title: ${populatedText.title}\nText language: ${populatedText.language.code}\nReported by user: ${user.username}\nReason for report: ${newReport.reasonForReporting}\nReport Text:\n"${newReport.reportText}"`,
                });
            }
        }
        reply.status(204).send();
    }
}

export const textController = new TextController();
