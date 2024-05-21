import {EntityManager, FilterQuery, raw} from "@mikro-orm/core";
import {Collection} from "@/src/models/entities/Collection.js";
import {CollectionRepo} from "@/src/models/repos/CollectionRepo.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {Language} from "@/src/models/entities/Language.js";
import {defaultVocabsByLevel, LanguageLevel} from "dzelda-common";
import {Text} from "@/src/models/entities/Text.js";
import {TextRepo} from "@/src/models/repos/TextRepo.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {EntityField} from "@mikro-orm/core/drivers/IDatabaseDriver.js";
import {CollectionBookmark} from "@/src/models/entities/CollectionBookmark.js";
import {SqlEntityManager} from "@mikro-orm/postgresql";
import {TextService} from "@/src/services/TextService.js";
import {Notification} from "@/src/models/entities/Notification.js";

export class CollectionService {
    em: SqlEntityManager;
    collectionRepo: CollectionRepo;
    textRepo: TextRepo;

    constructor(em: EntityManager) {
        this.em = em as SqlEntityManager;
        this.collectionRepo = this.em.getRepository(Collection) as CollectionRepo;
        this.textRepo = this.em.getRepository(Text) as TextRepo;
    }

    async getPaginatedCollections(filters: {
        languageCode?: string, addedBy?: string, searchQuery?: string, isBookmarked?: boolean
    }, sort: {
        sortBy: "title" | "createdDate" | "avgPastViewersCountPerText",
        sortOrder: "asc" | "desc"
    }, pagination: { page: number, pageSize: number }, user: User | AnonymousUser | null): Promise<[Collection[], number]> {
        const dbFilters: FilterQuery<Collection> = {$and: []};

        if (user && user instanceof User) {
            if (filters.isBookmarked)
                dbFilters.$and!.push({bookmarkers: user.profile});
            dbFilters.$and!.push({$or: [{isPublic: true}, {addedBy: user.profile}]});
        } else
            dbFilters.$and!.push({isPublic: true});
        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});
        if (filters.addedBy !== undefined)
            dbFilters.$and!.push({addedBy: {user: {username: filters.addedBy}}});
        if (filters.searchQuery !== undefined && filters.searchQuery !== "")
            dbFilters.$and!.push({$or: [{title: {$ilike: `%${filters.searchQuery}%`}}, {description: {$ilike: `%${filters.searchQuery}%`}}]});

        const dbOrderBy: QueryOrderMap<Collection>[] = [];
        if (sort.sortBy == "title")
            dbOrderBy.push({title: sort.sortOrder});
        else if (sort.sortBy == "createdDate")
            dbOrderBy.push({addedOn: sort.sortOrder});
        else if (sort.sortBy == "avgPastViewersCountPerText")
            dbOrderBy.push({avgPastViewersCountPerText: sort.sortOrder});
        dbOrderBy.push({id: "asc"});

        const [collections, totalCount] = await this.collectionRepo.findAndCount(dbFilters, {
            populate: ["language", "addedBy.user"],
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
        if (user && !(user instanceof AnonymousUser))
            await this.collectionRepo.annotateCollectionsWithUserData(collections, user);

        return [collections, totalCount];
    }

    async createCollection(fields: {
        language: Language, isPublic: boolean, title: string, description?: string, image?: string, texts?: Array<{
            title: string;
            content: string;
            isPublic: boolean,
            level?: LanguageLevel,
        }>
    }, user: User) {
        const newCollection = this.collectionRepo.create({
            title: fields.title,
            addedBy: user.profile,
            language: fields.language,
            description: fields.description,
            image: fields.image,
            isPublic: fields.isPublic
        });
        newCollection.vocabsByLevel = defaultVocabsByLevel();
        await this.em.flush();

        if (fields.texts) {
            this.em.transactional(async tm => {
                const textService = new TextService(tm);
                for (const textData of fields.texts!) {
                    await textService.createText({
                        title: textData.title,
                        content: textData.content,
                        language: fields.language,
                        collection: newCollection,
                        isPublic: textData.isPublic,
                        level: textData.level,
                    }, user, false);
                }
            }).then(() => {
                const notification = this.em.create(Notification, {
                    recipient: user.profile,
                    text: `Collection "${newCollection.title}" finished importing`,
                });
                this.em.persist(notification);
                this.em.flush();
            });
        }
        return newCollection;
    }

    async getCollection(collectionId: number, user: User | AnonymousUser | null) {
        const privateFilter: FilterQuery<Text & Collection> = user instanceof User ? {$or: [{isPublic: true}, {addedBy: user.profile}]} : {isPublic: true};

        const collection = await this.collectionRepo.findOne({$and: [{id: collectionId}, privateFilter]}, {populate: ["language", "addedBy", "addedBy.user"]});
        if (collection) {
            await collection.texts.init({where: privateFilter, orderBy: {orderInCollection: "asc"}, populate: ["addedBy.user"]});
            if (user && !(user instanceof AnonymousUser)) {
                await this.collectionRepo.annotateCollectionsWithUserData([collection], user);
                await this.textRepo.annotateTextsWithUserData(collection.texts.getItems(), user);
            }
        }
        return collection;
    }

    async updateCollection(collection: Collection, updatedCollectionData: {
        title: string;
        isPublic?: boolean;
        description: string;
        image?: string;
        textsOrder: number[]
    }, user: User) {
        collection.title = updatedCollectionData.title;
        collection.description = updatedCollectionData.description;
        if (updatedCollectionData.isPublic !== undefined)
            collection.isPublic = updatedCollectionData.isPublic;
        if (updatedCollectionData.image !== undefined)
            collection.image = updatedCollectionData.image;

        const idToOrder: Record<number, number> = updatedCollectionData.textsOrder.reduce((acc, curr, index) => ({
            ...acc,
            [curr]: index
        }), {});
        const collectionTexts = collection.texts.getItems();
        collectionTexts.forEach(l => l.orderInCollection = idToOrder[l.id]);
        this.em.persist(collection);
        this.em.persist(collectionTexts);
        await this.em.flush();

        return (await this.getCollection(collection.id, user))!;
    }

    async deleteCollection(collection: Collection) {
        await this.em.nativeDelete(Collection, {id: collection.id});
    }

    async getNextTextInCollection(collection: Collection, textId: number, user: User | AnonymousUser | null) {
        const queryBuilder = this.textRepo.createQueryBuilder("l0");
        const subQueryBuilder = this.textRepo.createQueryBuilder("l1").select("orderInCollection").where({id: textId}).getKnexQuery();
        const privateFilter: FilterQuery<Text> = user instanceof User ? {$or: [{isPublic: true}, {addedBy: user.profile}]} : {isPublic: true};

        return await queryBuilder.select("*")
            .where({collection: collection.id})
            .andWhere({"orderInCollection": {$gt: raw(`(${subQueryBuilder})`)}})
            .andWhere(privateFilter)
            .orderBy({orderInCollection: "asc"})
            .limit(1)
            .execute("get");
    }

    async findCollection(where: FilterQuery<Collection>, fields: EntityField<Collection>[] = ["id", "addedBy", "isPublic"]) {
        return await this.collectionRepo.findOne(where, {fields: fields as any}) as Collection;
    }

    async findBookMarkerCollectionMapping(where: FilterQuery<CollectionBookmark>, fields: EntityField<CollectionBookmark>[] = ["collection"]) {
        return await this.em.findOne(CollectionBookmark, where, {fields}) as CollectionBookmark;
    }

    async addCollectionToUserBookmarks(collection: Collection, user: User) {
        const bookmark = this.em.create(CollectionBookmark, {bookmarker: user.profile, collection: collection});
        await this.em.flush();
        await this.collectionRepo.annotateCollectionsWithUserData([collection], user);
        return bookmark;
    }

    async removeCollectionFromUserBookmarks(collection: Collection, user: User) {
        await this.em.nativeDelete(CollectionBookmark, {collection: collection, bookmarker: user.profile}, {});
    }

}
