import {EntityManager, EntityRepository, FilterQuery} from "@mikro-orm/core";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {User} from "@/src/models/entities/auth/User.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {Course} from "@/src/models/entities/Course.js";

export class DictionaryService {

    em: EntityManager;
    dictionaryRepo: EntityRepository<Dictionary>;

    constructor(em: EntityManager) {
        this.em = em;
        this.dictionaryRepo = this.em.getRepository(Dictionary);
    }

    async getUserDictionaries(user: User, filters: {}, sort: { sortBy: "name", sortOrder: "asc" | "desc" }) {
        const dbFilters: FilterQuery<Dictionary> = {$and: []};
        dbFilters.$and!.push({learners: user.profile});

        const dbOrderBy: QueryOrderMap<Dictionary>[] = [];
        if (sort.sortBy == "name")
            dbOrderBy.push({name: sort.sortOrder});
        dbOrderBy.push({id: "asc"});
        return await this.dictionaryRepo.find(dbFilters, {populate: ["language"], orderBy: dbOrderBy});
    }
}
