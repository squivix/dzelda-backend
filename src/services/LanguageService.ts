import {Language} from "../models/entities/Language.js";
import {EntityManager, EntityRepository} from "@mikro-orm/core";
import {cleanObject} from "../utils/utils.js";


class UserService {
    em: EntityManager;
    languageRepo: EntityRepository<Language>;

    constructor(em: EntityManager) {
        this.em = em;
        this.languageRepo = this.em.getRepository(Language);
    }

    async getLanguages(filters: { isSupported: boolean | undefined }) {
        if (filters.isSupported === undefined)
            delete filters.isSupported;
        const languages = await this.languageRepo.find(filters);
        return languages;
    }
}

export default UserService;