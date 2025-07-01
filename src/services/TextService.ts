import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {Text} from "@/src/models/entities/Text.js";
import {Language} from "@/src/models/entities/Language.js";
import {SqlEntityManager} from "@mikro-orm/postgresql";
import {TextRepo} from "@/src/models/repos/TextRepo.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {LanguageLevel} from "dzelda-common";
import {CollectionRepo} from "@/src/models/repos/CollectionRepo.js";
import {TextHistoryEntry} from "@/src/models/entities/TextHistoryEntry.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {EntityField} from "@mikro-orm/core/drivers/IDatabaseDriver.js";
import {TextBookmark} from "@/src/models/entities/TextBookmark.js";
import {MapHiderText} from "@/src/models/entities/MapHiderText.js";
import {FlaggedTextReport} from "@/src/models/entities/FlaggedTextReport.js";
import {TEXT_REPORT_HIDING_THRESHOLD} from "@/src/constants.js";
import amqp from "amqplib";
import {textVisibilityFilter} from "@/src/filters/textVisibilityFilter.js";
import {annotateFields, buildFetchPlan, ViewDescription} from "@/src/models/viewResolver.js";
import {textFetchSpecs} from "@/src/models/fetchSpecs/textFetchSpecs.js";
import {textHistoryEntryFetchSpecs} from "@/src/models/fetchSpecs/textHistoryEntryFetchSpecs.js";

const parseTextQueueKey = "parseTextWorkerQueue";

export class TextService {
    em: SqlEntityManager;
    textRepo: TextRepo;
    collectionRepo: CollectionRepo;

    constructor(em: EntityManager) {
        this.em = em as SqlEntityManager;
        this.textRepo = this.em.getRepository(Text) as TextRepo;
        this.collectionRepo = this.em.getRepository(Collection) as CollectionRepo;
    }

    async getPaginatedTexts(filters: {
                                languageCode?: string,
                                addedBy?: string,
                                searchQuery?: string,
                                level?: LanguageLevel[],
                                hasAudio?: boolean;
                                isBookmarked?: boolean;
                                isHiddenByUser?: boolean;
                            },
                            sort: { sortBy: "title" | "createdDate" | "pastViewersCount", sortOrder: "asc" | "desc" },
                            pagination: { page: number, pageSize: number },
                            user: User | AnonymousUser | null, viewDescription: ViewDescription): Promise<[Text[], number]> {
        const dbFilters: FilterQuery<Text> = {$and: []};
        dbFilters.$and!.push({isRemovedByMods: false});
        dbFilters.$and!.push(textVisibilityFilter(user));

        if (user && user instanceof User) {
            if (!filters.isHiddenByUser)
                dbFilters.$and!.push({hiddenBy: {$none: user.profile}});
            else
                dbFilters.$and!.push({hiddenBy: {$some: user.profile}});
            if (filters.isBookmarked)
                dbFilters.$and!.push({bookmarkers: user.profile});
        }
        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});
        if (filters.addedBy !== undefined)
            dbFilters.$and!.push({addedBy: {user: {username: filters.addedBy}}});
        if (filters.searchQuery !== undefined && filters.searchQuery !== "")
            dbFilters.$and!.push({title: {$ilike: `%${filters.searchQuery}%`}});
        if (filters.level !== undefined)
            dbFilters.$and!.push({$or: filters.level.map(level => ({level}))});
        if (filters.hasAudio !== undefined)
            dbFilters.$and!.push({audio: {[filters.hasAudio ? "$ne" : "$eq"]: ""}});

        const dbOrderBy: QueryOrderMap<Text>[] = [];
        if (sort.sortBy == "title")
            dbOrderBy.push({title: sort.sortOrder});
        else if (sort.sortBy == "createdDate")
            dbOrderBy.push({addedOn: sort.sortOrder});
        else if (sort.sortBy == "pastViewersCount")
            dbOrderBy.push({pastViewersCount: sort.sortOrder});
        dbOrderBy.push({id: "asc"});

        const {fields: dbFields, populate: dbPopulate, annotatedFields} = buildFetchPlan(viewDescription, textFetchSpecs(), {user, em: this.em});
        let [texts, totalCount] = await this.textRepo.findAndCount(dbFilters, {
            fields: dbFields as any,
            populate: dbPopulate as any,
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
        await annotateFields(texts, annotatedFields, textFetchSpecs());
        return [texts, totalCount];
    }

    async getPaginatedTextHistory(filters: {
                                      languageCode?: string,
                                      addedBy?: string,
                                      searchQuery?: string,
                                      level?: LanguageLevel[],
                                      hasAudio?: boolean;
                                  },
                                  sort: {
                                      sortBy: "timeViewed" | "title" | "createdDate" | "pastViewersCount",
                                      sortOrder: "asc" | "desc"
                                  },
                                  pagination: { page: number, pageSize: number },
                                  user: User, viewDescription: ViewDescription): Promise<[TextHistoryEntry[], number]> {
        const dbFilters: FilterQuery<TextHistoryEntry> = {$and: []};
        dbFilters.$and!.push({text: {isRemovedByMods: false}});
        dbFilters.$and!.push({text: {hiddenBy: {$none: user.profile}}});
        dbFilters.$and!.push({text: textVisibilityFilter(user)});


        dbFilters.$and!.push({pastViewer: user.profile});

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({text: {language: {code: filters.languageCode}}});
        if (filters.addedBy !== undefined)
            dbFilters.$and!.push({text: {addedBy: {user: {username: filters.addedBy}}}});
        if (filters.searchQuery !== undefined && filters.searchQuery !== "")
            dbFilters.$and!.push({text: {title: {$ilike: `%${filters.searchQuery}%`}}});
        if (filters.level !== undefined)
            dbFilters.$and!.push({text: {$or: filters.level.map(level => ({level}))}});
        if (filters.hasAudio !== undefined)
            dbFilters.$and!.push({text: {audio: {[filters.hasAudio ? "$ne" : "$eq"]: ""}}});

        const dbOrderBy: QueryOrderMap<TextHistoryEntry>[] = [];
        if (sort.sortBy == "title")
            dbOrderBy.push({text: {title: sort.sortOrder}});
        else if (sort.sortBy == "createdDate")
            dbOrderBy.push({text: {addedOn: sort.sortOrder}});
        else if (sort.sortBy == "pastViewersCount")
            dbOrderBy.push({text: {pastViewersCount: sort.sortOrder}});
        else if (sort.sortBy == "timeViewed")
            dbOrderBy.push({timeViewed: sort.sortOrder});
        dbOrderBy.push({text: {id: "asc"}});

        const {fields: dbFields, populate: dbPopulate, annotatedFields} = buildFetchPlan(viewDescription, textHistoryEntryFetchSpecs(), {user, em: this.em});
        let [textHistoryEntries, totalCount] = await this.em.findAndCount(TextHistoryEntry, dbFilters, {
            fields: dbFields as any,
            populate: dbPopulate as any,
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });

        await annotateFields(textHistoryEntries, annotatedFields, textHistoryEntryFetchSpecs());
        return [textHistoryEntries, totalCount];
    }

    async createText(fields: {
        title: string;
        content: string;
        language: Language;
        collection: Collection | null;
        isPublic: boolean,
        orderInCollection: number | null
        level?: LanguageLevel,
        image?: string;
        audio?: string;
    }, user: User, {parsingPriority = 2}: {
        populate?: boolean,
        parsingPriority?: 1 | 2
    } = {}) {
        let newText = this.textRepo.create({
            title: fields.title,
            content: fields.content,
            language: fields.language,
            addedBy: user.profile,
            image: fields.image,
            audio: fields.audio,
            collection: fields.collection,
            isPublic: fields.isPublic,
            level: fields.level,
            orderInCollection: fields.orderInCollection,
            isLastInCollection: true,
            isProcessing: true,
            pastViewersCount: 0
        });
        await this.em.flush();
        await TextService.sendTextToParsingQueue({textId: newText.id, parsingPriority: parsingPriority})
        return newText;
    }

    async getText(textId: number, user: User | AnonymousUser | null, viewDescription: ViewDescription) {
        const dbFilters: FilterQuery<Text> = {$and: [{id: textId}]};
        dbFilters.$and!.push({isRemovedByMods: false});
        dbFilters.$and!.push(textVisibilityFilter(user));
        if (user instanceof User)
            dbFilters.$and!.push({hiddenBy: {$none: user.profile}});

        const {fields: dbFields, populate: dbPopulate, annotatedFields} = buildFetchPlan(viewDescription, textFetchSpecs(), {user, em: this.em});

        let text = await this.em.findOne(Text, dbFilters, {
            fields: dbFields as any,
            populate: dbPopulate as any,
            refresh: true,
        });

        if (text)
            await annotateFields([text], annotatedFields, textFetchSpecs());
        return text as Text;
    }

    async updateText(text: Text, updatedTextData: {
        title: string;
        content: string;
        collection?: Collection | null,
        level?: LanguageLevel,
        isPublic?: boolean,
        image?: string;
        audio?: string;
    }, user: User) {
        const isTitleContentChanged = text.title !== updatedTextData.title || text.content !== updatedTextData.content;
        if (isTitleContentChanged) {
            text.title = updatedTextData.title;
            text.content = updatedTextData.content;
            text.isProcessing = true;
            text.parsedContent = null;
            text.parsedTitle = null;
        }
        if (updatedTextData.collection !== undefined) {
            if (updatedTextData.collection == null) {
                text.collection = null;
                text.orderInCollection = null;
                text.isLastInCollection = null;
            } else if (text.collection?.id !== updatedTextData.collection.id) {
                text.orderInCollection = await updatedTextData.collection.texts.loadCount(true);
                text.isLastInCollection = true;
                text.collection = updatedTextData.collection;
            }
        }
        if (updatedTextData.isPublic !== undefined)
            text.isPublic = updatedTextData.isPublic;

        if (updatedTextData.level !== undefined)
            text.level = updatedTextData.level;

        if (updatedTextData.image !== undefined)
            text.image = updatedTextData.image;

        if (updatedTextData.audio !== undefined)
            text.audio = updatedTextData.audio;

        await this.em.persistAndFlush(text);

        if (isTitleContentChanged)
            await TextService.sendTextToParsingQueue({textId: text.id, parsingPriority: 2});
    }

    async deleteText(text: Text) {
        await this.em.nativeDelete(Text, {id: text.id});
    }

    async addTextToUserHistory(text: Text, user: User) {
        const historyEntry = this.em.create(TextHistoryEntry, {pastViewer: user.profile, text: text});
        await this.em.flush();
        await this.em.refresh(historyEntry.text, {populate: ["orderInCollection", "addedBy.user"]});
        return historyEntry;
    }

    async getLatestTextHistoryEntry(user: User, viewDescription: ViewDescription) {
        const {fields: dbFields, populate: dbPopulate, annotatedFields} = buildFetchPlan(viewDescription, textHistoryEntryFetchSpecs(), {user, em: this.em});

        let textHistoryEntry = await this.em.findOne(TextHistoryEntry, {pastViewer: user.profile}, {
            fields: dbFields as any,
            populate: dbPopulate as any,
            orderBy: {timeViewed: "desc"},
            refresh: true,
        });

        if (textHistoryEntry)
            await annotateFields([textHistoryEntry], annotatedFields, textHistoryEntryFetchSpecs());
        return textHistoryEntry;
        // return await this.em.findOne(TextHistoryEntry, {pastViewer: user.profile}, {orderBy: {timeViewed: "desc"}});
    }

    async getTextHistoryEntry(textHistoryEntryId: number, user: User, viewDescription: ViewDescription) {
        const {fields: dbFields, populate: dbPopulate, annotatedFields} = buildFetchPlan(viewDescription, textHistoryEntryFetchSpecs(), {user, em: this.em});
        let textHistoryEntry = await this.em.findOne(TextHistoryEntry, {id: textHistoryEntryId, pastViewer: user.profile}, {
            fields: dbFields as any,
            populate: dbPopulate as any,
            refresh: true,
        });

        if (textHistoryEntry)
            await annotateFields([textHistoryEntry], annotatedFields, textHistoryEntryFetchSpecs());
        return textHistoryEntry as TextHistoryEntry;
    }

    async addTextToUserBookmarks(text: Text, user: User) {
        const bookmark = this.em.create(TextBookmark, {bookmarker: user.profile, text: text});
        await this.em.flush();
        return bookmark;
    }

    async removeTextFromUserBookmarks(text: Text, user: User) {
        await this.em.nativeDelete(TextBookmark, {text: text, bookmarker: user.profile});
    }

    async hideTextForUser(text: Text, user: User, onConflictIgnore = false) {
        if (onConflictIgnore)
            await this.em.upsert(MapHiderText, {hider: user.profile, text: text}, {onConflictAction: "ignore"});
        else {
            this.em.create(MapHiderText, {hider: user.profile, text: text});
            await this.em.flush();
        }
    }

    async unhideTextForUser(text: Text, user: User) {
        await this.em.nativeDelete(MapHiderText, {text: text, hider: user.profile});
    }

    async createFlaggedTextReport(fields: {
        text: Text,
        reportingUser: User,
        reasonForReporting: string,
        reportText?: string
    }) {
        const report = this.em.create(FlaggedTextReport, {
            text: fields.text,
            reporter: fields.reportingUser.profile,
            reasonForReporting: fields.reasonForReporting,
            reportText: fields.reportText,
        });
        await this.em.flush();
        if (fields.reportingUser.isAdmin || await fields.text.flaggedReports.loadCount({where: {isValid: true}}) >= TEXT_REPORT_HIDING_THRESHOLD) {
            fields.text.isRemovedByMods = true;
            await this.em.flush();
        }
        return report;
    }

    async findText(where: FilterQuery<Text>, fields: EntityField<Text>[] = ["id", "collection", "language", "isPublic", "addedBy"]) {
        return await this.em.findOne(Text, {$and: [where, {isRemovedByMods: false}]}, {fields: fields as any}) as Text;
    }

    async findTextBookmark(where: FilterQuery<TextBookmark>, fields: EntityField<TextBookmark>[] = ["id", "text", "bookmarker"]) {
        return await this.em.findOne(TextBookmark, {$and: [where, {text: {isRemovedByMods: false}}]}, {fields: fields as any}) as TextBookmark;
    }

    async findHiderTextMapping(where: FilterQuery<MapHiderText>, fields: EntityField<MapHiderText>[] = ["id", "text", "hider"]) {
        return await this.em.findOne(MapHiderText, where, {fields});
    }

    async findFlaggedTextReport(where: FilterQuery<FlaggedTextReport>, fields: EntityField<FlaggedTextReport>[] = ["id", "reportText", "reasonForReporting", "reporter"]) {
        return await this.em.findOne(FlaggedTextReport, where, {fields: fields as any});
    }

    static async sendTextToParsingQueue({textId, parsingPriority}: { textId: number, parsingPriority: 1 | 2 }) {
        const connection = await amqp.connect(process.env.RABBITMQ_CONNECTION_URL!);
        const channel = await connection.createChannel();
        await channel.assertQueue(parseTextQueueKey, {
            durable: true,
            maxPriority: 2
        });
        channel.sendToQueue(parseTextQueueKey, Buffer.from(JSON.stringify({textId: textId})), {
            persistent: true,
            priority: parsingPriority,
            headers: {attempts: 0}
        });
        await channel.close()
        await connection.close()
    }
}
