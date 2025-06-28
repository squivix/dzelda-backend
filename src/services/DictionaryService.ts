import {EntityManager, EntityRepository, FilterQuery} from "@mikro-orm/core";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {User} from "@/src/models/entities/auth/User.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {EntityField} from "@mikro-orm/core/drivers/IDatabaseDriver.js";
import {buildFetchPlan, ViewDescription} from "@/src/models/viewResolver.js";
import {dictionaryFieldFetchMap} from "@/src/models/fetchSpecs/dictionaryFieldFetchMap.js";

export class DictionaryService {

    em: EntityManager;
    dictionaryRepo: EntityRepository<Dictionary>;

    constructor(em: EntityManager) {
        this.em = em;
        this.dictionaryRepo = this.em.getRepository(Dictionary);
    }


    async getDictionaries(filters: { languageCode?: string, isPronunciation?: boolean }, sort: {
        sortBy: "name",
        sortOrder: "asc" | "desc"
    }, viewDescription: ViewDescription) {
        const dbFilters: FilterQuery<Dictionary> = {$and: []};
        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});
        if (filters.isPronunciation !== undefined)
            dbFilters.$and!.push({isPronunciation: filters.isPronunciation});

        const dbOrderBy: QueryOrderMap<Dictionary>[] = [];
        if (sort.sortBy == "name")
            dbOrderBy.push({name: sort.sortOrder});
        dbOrderBy.push({id: "asc"});
        const {fields: dbFields, populate: dbPopulate} = buildFetchPlan(viewDescription, dictionaryFieldFetchMap, {user: null, em: this.em});
        return await this.em.find(Dictionary, dbFilters, {
            fields: dbFields as any,
            populate: dbPopulate as any,
            orderBy: dbOrderBy
        });
    }

    async getLearnerDictionaries(filters: { languageCode?: string, isPronunciation?: boolean }, user: User, viewDescription: ViewDescription) {
        const dbFilters: FilterQuery<MapLearnerDictionary> = {$and: []};

        dbFilters.$and!.push({learner: user.profile});
        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({dictionary: {language: {code: filters.languageCode}}});
        if (filters.isPronunciation !== undefined)
            dbFilters.$and!.push({dictionary: {isPronunciation: filters.isPronunciation}});

        const {fields: dictionaryFields, populate: dictionaryPopulate} = buildFetchPlan(viewDescription, dictionaryFieldFetchMap, {user: null, em: this.em});
        const learnerMappings = await this.em.find(MapLearnerDictionary, dbFilters, {
            fields: dictionaryFields.map(f => `dictionary.${f}`) as any,
            populate: dictionaryPopulate.map(f => `dictionary.${f}`) as any,
            orderBy: [{order: "asc"}, {dictionary: {name: "asc"}, id: "asc"}]
        });
        return learnerMappings.map(m => m.dictionary);
    }

    async updateUserLanguageDictionaries(orderedDictionaryIds: number[], user: User) {
        await this.em.transactional(async (tm) => {
            await tm.nativeDelete(MapLearnerDictionary, {learner: user.profile});
            await tm.insertMany(MapLearnerDictionary, orderedDictionaryIds.map((d, i) => ({learner: user.profile, dictionary: d, order: i})));
        })
    }

    async findDictionaries(where: FilterQuery<Dictionary>, fields: EntityField<Dictionary>[] = ["id", "language"]) {
        return await this.em.find(Dictionary, where, {fields: fields});
    }
}
