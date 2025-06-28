import {EntityManager, EntityRepository, FilterQuery, raw} from "@mikro-orm/core";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Text} from "@/src/models/entities/Text.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabLevel} from "dzelda-common";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";
import {buildFetchPlan, ViewDescription} from "@/src/models/viewResolver.js";
import {meaningFieldFetchMap} from "@/src/models/fetchSpecs/meaningFieldFetchMap.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {EntityField} from "@mikro-orm/core/drivers/IDatabaseDriver.js";

export class MeaningService {

    em: EntityManager;

    constructor(em: EntityManager) {
        this.em = em;
    }

    async getMeaning(meaningId: number, viewDescription: ViewDescription) {
        const {fields: dbFields, populate: dbPopulate} = buildFetchPlan(viewDescription, meaningFieldFetchMap, {user: null, em: this.em});
        return await this.em.findOne(Meaning, {id: meaningId}, {
            fields: dbFields as any,
            populate: dbPopulate as any,
        }) as Meaning;
    }

    async getMeaningByText(meaningData: { vocab: Vocab; language: TranslationLanguage; text: string }, viewDescription: ViewDescription) {
        const {fields: dbFields, populate: dbPopulate} = buildFetchPlan(viewDescription, meaningFieldFetchMap, {user: null, em: this.em});
        return await this.em.findOne(Meaning, {
            vocab: meaningData.vocab,
            text: meaningData.text,
            language: meaningData.language
        }, {
            fields: dbFields as any,
            populate: dbPopulate as any,
        });
    }

    async createMeaning(meaningData: { vocab: Vocab, vocabVariant: VocabVariant | null; language: TranslationLanguage; text: string }, user: User) {
        const newMeaning = this.em.create(Meaning, {
            text: meaningData.text,
            language: meaningData.language,
            vocab: meaningData.vocab,
            addedBy: user.profile,
            learnersCount: 0,
            vocabVariant: meaningData.vocabVariant
        });
        await this.em.flush();
        return newMeaning;
    }

    async getUserMeanings(filters: { vocabId?: number },
                          sort: { sortBy: "text" | "learnersCount", sortOrder: "asc" | "desc" },
                          pagination: { page: number, pageSize: number },
                          user: User, viewDescription: ViewDescription): Promise<[Meaning[], number]> {
        const dbFilters: FilterQuery<Meaning> = {$and: []};
        dbFilters.$and!.push({learners: user.profile});
        if (filters.vocabId)
            dbFilters.$and!.push({vocab: filters.vocabId});

        const dbOrderBy: QueryOrderMap<Meaning>[] = [];
        if (sort.sortBy == "text")
            dbOrderBy.push({text: sort.sortOrder});
        else if (sort.sortBy == "learnersCount")
            dbOrderBy.push({learnersCount: sort.sortOrder});

        const {fields: dbFields, populate: dbPopulate} = buildFetchPlan(viewDescription, meaningFieldFetchMap, {user: null, em: this.em});
        return await this.em.findAndCount(Meaning, dbFilters, {
            fields: dbFields as any,
            populate: dbPopulate as any,
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
    }

    async getTextMeanings(text: Text, user: User | AnonymousUser | null, viewDescription: ViewDescription) {
        const {fields: dbFields, populate: dbPopulate} = buildFetchPlan(viewDescription, meaningFieldFetchMap, {user: user, em: this.em});
        const meanings = await this.em.find(Meaning, {
            vocab: {textsAppearingIn: text}
        }, {
            fields: dbFields as any,
            populate: dbPopulate as any,
            orderBy: [{vocab: {id: "asc"}}, {learnersCount: "desc"}, {[raw(alias => `length(${alias}.text)`)]: "asc"}, {id: "asc"}]
        })
        if (!(user instanceof User)) {
            return {
                meanings: meanings,
                learnerMeanings: null
            }
        }

        const learnerMeanings = await this.em.find(Meaning, {
            vocab: {textsAppearingIn: text},
            learners: user.profile
        }, {
            fields: ["id"],
            populate: [],
            orderBy: [{vocab: {id: "asc"}}, {learnersCount: "desc"}, {[raw(alias => `length(${alias}.text)`)]: "asc"}, {id: "asc"}]
        });
        return {
            meanings: meanings,
            learnerMeanings: learnerMeanings
        }
    }

    async getUserMeaning(meaningId: number, user: User, viewDescription: ViewDescription) {
        const {fields: meaningFields, populate: meaningPopulate} = buildFetchPlan(viewDescription, meaningFieldFetchMap, {user: user, em: this.em});
        return await this.em.findOne(MapLearnerMeaning, {
            meaning: meaningId,
            learner: user.profile
        }, {
            fields: meaningFields.map(m => `meaning.${m}`) as any,
            populate: meaningPopulate.map(m => `meaning.${m}`) as any,
            refresh: true
        });
    }

    async addMeaningToUserLearning(meaning: Meaning, user: User) {
        this.em.create(MapLearnerMeaning, {learner: user.profile, meaning: meaning});
        await this.em.flush();
        await this.em.nativeUpdate(MapLearnerVocab, {
            learner: user.profile,
            vocab: meaning.vocab,
            level: {$in: [VocabLevel.LEARNED, VocabLevel.KNOWN, VocabLevel.IGNORED]}
        }, {level: VocabLevel.LEVEL_1});
    }

    async removeMeaningFromUser(meaningMapping: MapLearnerMeaning) {
        this.em.remove(meaningMapping);
        await this.em.flush();
    }

    async findMeaning(where: FilterQuery<Meaning>, fields: EntityField<Meaning>[] = ["id"]) {
        return await this.em.findOne(Meaning, where, {fields: fields as any});
    }

    async findLearnerMeaning(where: FilterQuery<MapLearnerMeaning>, fields: EntityField<MapLearnerMeaning>[] = ["learner", "meaning"]) {
        return await this.em.findOne(MapLearnerMeaning, where, {fields: fields as any});
    }
}
