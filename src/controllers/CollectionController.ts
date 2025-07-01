import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {CollectionService} from "@/src/services/CollectionService.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {languageCodeValidator} from "@/src/validators/languageValidators.js";
import {UnauthenticatedAPIError} from "@/src/utils/errors/UnauthenticatedAPIError.js";
import {collectionDescriptionValidator, collectionTitleValidator} from "@/src/validators/collectionValidator.js";
import {NotFoundAPIError} from "@/src/utils/errors/NotFoundAPIError.js";
import {ForbiddenAPIError} from "@/src/utils/errors/ForbiddenAPIError.js";
import {ValidationAPIError} from "@/src/utils/errors/ValidationAPIError.js";
import {LanguageService} from "@/src/services/LanguageService.js";
import {booleanStringValidator, numericStringValidator} from "@/src/validators/utilValidators.js";
import {APIError} from "@/src/utils/errors/APIError.js";
import {UserService} from "@/src/services/UserService.js";
import {validateFileObjectKey} from "@/src/controllers/controllerUtils.js";
import {textContentValidator, textLevelValidator, textTitleValidator} from "@/src/validators/textValidators.js";
import {collectionSerializer} from "@/src/presentation/response/serializers/Collection/CollectionSerializer.js";
import {collectionSummarySerializer} from "@/src/presentation/response/serializers/Collection/CollectionSummarySerializer.js";
import {collectionLoggedInSerializer} from "@/src/presentation/response/serializers/Collection/CollectionLoggedInSerializer.js";
import {collectionSummaryLoggedInSerializer} from "@/src/presentation/response/serializers/Collection/CollectionSummaryLoggedInSerializer.js";
import {collectionVisibilityFilter} from "@/src/filters/collectionVisibilityFilter.js";

class CollectionController {
    async getCollections(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: z.string().min(1).or(z.literal("me")).optional(),
            searchQuery: z.string().max(256).optional(),
            sortBy: z.union([z.literal("title"), z.literal("createdDate"), z.literal("avgPastViewersCountPerText")]).optional().default("title"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        if (queryParams.addedBy == "me") {
            if (!request.isLoggedIn)
                throw new UnauthenticatedAPIError(request.user as AnonymousUser | null);
            queryParams.addedBy = request.user?.username;
        }
        const serializer = request.isLoggedIn ? collectionSummaryLoggedInSerializer : collectionSummarySerializer;
        const filters = {
            languageCode: queryParams.languageCode,
            addedBy: queryParams.addedBy,
            searchQuery: queryParams.searchQuery,
        };
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const collectionService = new CollectionService(request.em);
        const [collections, recordsCount] = await collectionService.getPaginatedCollections(filters, sort, pagination, request.user, serializer.view);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: serializer.serializeList(collections)
        });
    }

    async createCollection(request: FastifyRequest, reply: FastifyReply) {
        const bodyValidator = z.object({
            languageCode: languageCodeValidator,
            title: collectionTitleValidator,
            description: collectionDescriptionValidator.optional(),
            isPublic: z.boolean().optional().default(true),
            image: z.string().optional(),
            texts: z.array(z.object({
                title: textTitleValidator,
                content: textContentValidator,
                isPublic: z.boolean().optional().default(true),
                level: textLevelValidator.optional(),
            })).optional()
        });
        const body = bodyValidator.parse(request.body);
        const user = request.user as User;
        const serializer = collectionSummaryLoggedInSerializer;


        const languageService = new LanguageService(request.em);
        const language = await languageService.findLearningLanguage({code: body.languageCode});
        if (!language)
            throw new ValidationAPIError({language: "not found"});
        const userService = new UserService(request.em);
        if (body.image)
            body.image = await validateFileObjectKey(userService, request.user as User, body.image, "collectionImage", "image");
        const collectionService = new CollectionService(request.em);
        let newCollection = await collectionService.createCollection({
            language: language,
            title: body.title,
            description: body.description,
            isPublic: body.isPublic,
            image: body.image,
            texts: body.texts,
        }, user);
        newCollection = await collectionService.getCollection(newCollection.id, user, serializer.view)
        reply.status(201).send(serializer.serialize(newCollection));
    }

    async getCollection(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({collectionId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const serializer = request.isLoggedIn ? collectionLoggedInSerializer : collectionSerializer;
        const collectionService = new CollectionService(request.em);
        const collection = await collectionService.getCollection(pathParams.collectionId, request.user, serializer.view);

        if (!collection)
            throw new NotFoundAPIError("Collection");
        reply.status(200).send(serializer.serialize(collection));
    }

    async updateCollection(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({collectionId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const bodyValidator = z.object({
            title: collectionTitleValidator,
            description: collectionDescriptionValidator,
            isPublic: z.boolean().optional(),
            textsOrder: z.array(z.number().int().min(0)).refine(e => new Set(e).size === e.length),
            image: z.string().optional(),
        });
        const body = bodyValidator.parse(request.body);
        const user = request.user as User;
        const serializer = collectionLoggedInSerializer;

        const collectionService = new CollectionService(request.em);
        const collection = await collectionService.findCollection(pathParams.collectionId, ["id", "addedBy", "texts", "isPublic"]);

        if (!collection)
            throw new NotFoundAPIError("Collection");
        if (request?.user?.profile !== collection.addedBy)
            throw collection.isPublic ? new ForbiddenAPIError() : new NotFoundAPIError("Collection");

        const textOrderIdSet = new Set(body.textsOrder);
        if (collection.texts.length !== body.textsOrder.length || !collection.texts.getItems().map(c => c.id).every(l => textOrderIdSet.has(l)))
            throw new ValidationAPIError({textsOrder: "ids don't match collection text: cannot add or remove texts through this endpoint, only reorder"});
        const userService = new UserService(request.em);
        if (body.image)
            body.image = await validateFileObjectKey(userService, request.user as User, body.image, "collectionImage", "image");

        await collectionService.updateCollection(collection, {
            title: body.title,
            description: body.description,
            image: body.image,
            textsOrder: body.textsOrder,
            isPublic: body.isPublic
        }, request.user as User);
        const updatedCollection = await collectionService.getCollection(collection.id, user, serializer.view);
        reply.status(200).send(serializer.serialize(updatedCollection));
    }

    async deleteCollection(request: FastifyRequest, reply: FastifyReply) {
        const pathParamsValidator = z.object({collectionId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);
        const queryParamsValidator = z.object({
            cascadeTexts: booleanStringValidator.default(false)
        });
        const queryParams = queryParamsValidator.parse(request.query);

        const user = request.user as User;
        const collectionService = new CollectionService(request.em);
        const collection = await collectionService.findCollection({id: pathParams.collectionId, ...collectionVisibilityFilter(user) as object});

        if (!collection)
            throw new NotFoundAPIError("Collection");
        if (collection.addedBy !== user.profile)
            throw new ForbiddenAPIError("User is not authorized to delete collection");
        await collectionService.deleteCollection(collection, {cascadeTexts: queryParams.cascadeTexts});
        reply.status(204).send();
    }

    async getUserBookmarkedCollections(request: FastifyRequest, reply: FastifyReply) {
        const queryParamsValidator = z.object({
            languageCode: languageCodeValidator.optional(),
            addedBy: z.string().min(1).or(z.literal("me")).optional(),
            searchQuery: z.string().max(256).optional(),
            sortBy: z.union([z.literal("title"), z.literal("createdDate"), z.literal("avgPastViewersCountPerText")]).optional().default("title"),
            sortOrder: z.union([z.literal("asc"), z.literal("desc")]).optional().default("asc"),
            page: z.coerce.number().int().min(1).optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
        });
        const queryParams = queryParamsValidator.parse(request.query);
        if (queryParams.addedBy == "me")
            queryParams.addedBy = request.user!.username;
        const serializer = collectionSummaryLoggedInSerializer;
        const filters = {
            languageCode: queryParams.languageCode,
            addedBy: queryParams.addedBy,
            searchQuery: queryParams.searchQuery,
            isBookmarked: true
        };
        const sort = {sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder};
        const pagination = {page: queryParams.page, pageSize: queryParams.pageSize};
        const collectionService = new CollectionService(request.em);
        const [collections, recordsCount] = await collectionService.getPaginatedCollections(filters, sort, pagination, request.user, serializer.view);
        reply.send({
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(recordsCount / pagination.pageSize),
            data: serializer.serializeList(collections)
        });
    }

    async addCollectionToUserBookmarks(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const bodyValidator = z.object({collectionId: z.number().min(0)});
        const body = bodyValidator.parse(request.body);
        const serializer = collectionLoggedInSerializer;

        const collectionService = new CollectionService(request.em);
        const collection = await collectionService.getCollection(body.collectionId, request.user, serializer.view);
        if (!collection)
            throw new ValidationAPIError({collection: "Not found"});
        if (!(request.user as User).profile.languagesLearning.contains(collection.language))
            throw new ValidationAPIError({collection: "not in a language the user is learning"});

        const existingCollectionMapping = await collectionService.findBookMarkerCollectionMapping({collection: collection, bookmarker: user.profile});
        if (!existingCollectionMapping)
            await collectionService.addCollectionToUserBookmarks(collection, request.user as User);

        reply.status(existingCollectionMapping ? 200 : 201).send(serializer.serialize(collection));
    }

    async removeCollectionFromUserBookmarks(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as User;
        const pathParamsValidator = z.object({collectionId: numericStringValidator});
        const pathParams = pathParamsValidator.parse(request.params);

        const collectionService = new CollectionService(request.em);

        const collection = await collectionService.findCollection(pathParams.collectionId);
        if (!collection)
            throw new NotFoundAPIError("Collection");

        const existingCollectionMapping = await collectionService.findBookMarkerCollectionMapping({collection: collection, bookmarker: user.profile});
        if (!existingCollectionMapping)
            throw new APIError(404, "Collection is not bookmarked");

        await collectionService.removeCollectionFromUserBookmarks(collection, user);
        reply.status(204).send();
    }
}

export const collectionController = new CollectionController();
