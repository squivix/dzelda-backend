import {EntityManager, EntityRepository, FilterQuery} from "@mikro-orm/core";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {User} from "@/src/models/entities/auth/User.js";

export class DictionaryService {

    em: EntityManager;
    dictionaryRepo: EntityRepository<Dictionary>;

    constructor(em: EntityManager) {
        this.em = em;
        this.dictionaryRepo = this.em.getRepository(Dictionary);
    }

    async getUserDictionaries(user: User, filters: {}) {
        const dbFilters: FilterQuery<Dictionary> = {$and: []};
        dbFilters.$and!.push({learners: user.profile});
        return await this.dictionaryRepo.find(dbFilters, {populate: ["language"]});
    }
}
