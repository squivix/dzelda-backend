import {EntityManager, EntityRepository, FilterQuery} from "@mikro-orm/core";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {Course} from "@/src/models/entities/Course.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {EntityField} from "@mikro-orm/core/drivers/IDatabaseDriver.js";

export class DictionaryService {

    em: EntityManager;
    dictionaryRepo: EntityRepository<Dictionary>;

    constructor(em: EntityManager) {
        this.em = em;
        this.dictionaryRepo = this.em.getRepository(Dictionary);
    }


    async getDictionaries(filters: { languageCode?: string, isLearning?: boolean }, sort: {
        sortBy: "name",
        sortOrder: "asc" | "desc"
    }, user?: User | AnonymousUser | null) {
        const dbFilters: FilterQuery<Dictionary> = {$and: []};
        if (user && user instanceof User && filters.isLearning)
            dbFilters.$and!.push({learners: user.profile});
        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});

        const dbOrderBy: QueryOrderMap<Dictionary>[] = [];
        if (sort.sortBy == "name")
            dbOrderBy.push({name: sort.sortOrder});
        dbOrderBy.push({id: "asc"});
        return await this.dictionaryRepo.find(dbFilters, {populate: ["language"], orderBy: dbOrderBy});
    }

    async getLearnerDictionaries(filters: { languageCode?: string, isLearning?: boolean }, user: User) {
        const dbFilters: FilterQuery<MapLearnerDictionary> = {$and: []};

        dbFilters.$and!.push({learner: user.profile});
        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({dictionary: {language: {code: filters.languageCode}}});

        return await this.em.find(MapLearnerDictionary, dbFilters, {
            populate: ["dictionary", "dictionary.language"],
            orderBy: [{order: "asc"}, {dictionary: {name: "asc"}, id: "asc"}]
        });
    }

    async updateUserLanguageDictionaries(dictionaries: Dictionary[], user: User) {
        await this.em.nativeDelete(MapLearnerDictionary, {learner: user.profile});
        await this.em.insertMany(MapLearnerDictionary, dictionaries.map((d, i) => ({learner: user.profile, dictionary: d, order: i})));
    }

    async findDictionaries(where: FilterQuery<Dictionary>, fields: EntityField<Dictionary>[] = ["id", "language"]) {
        return await this.em.find(Dictionary, where, {fields: fields});
    }
}
