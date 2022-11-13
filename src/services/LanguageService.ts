import {Language} from "@/src/models/entities/Language.js";
import {EntityManager, EntityRepository} from "@mikro-orm/core";
import {User} from "@/src/models/entities/auth/User.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";


class LanguageService {
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
        await this.em.flush();
        return languages;
    }

    async getUserLanguages(user: User, filters: {}) {
        const languages = await this.languageRepo.find({learners: user.profile, ...filters});
        await this.em.flush();
        return languages;
    }
}

export default LanguageService;