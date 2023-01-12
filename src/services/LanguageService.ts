import {Language} from "@/src/models/entities/Language.js";
import {EntityManager, EntityRepository} from "@mikro-orm/core";
import {User} from "@/src/models/entities/auth/User.js";
import {cleanObject} from "@/src/utils/utils.js";

class LanguageService {
    em: EntityManager;
    languageRepo: EntityRepository<Language>;

    constructor(em: EntityManager) {
        this.em = em;
        this.languageRepo = this.em.getRepository(Language);
    }

    async getLanguages(filters: { isSupported: boolean | undefined }) {
        const languages = await this.languageRepo.find(cleanObject(filters));
        await this.em.flush();
        return languages;
    }

    async getUserLanguages(user: User, filters: {}) {
        const languages = await this.languageRepo.find({learners: user.profile, ...filters});
        await this.em.flush();
        return languages;
    }

    async getLanguage(code: string) {
        const language = await this.languageRepo.findOneOrFail({code});
        await this.em.flush();
        return language;
    }
}

export default LanguageService;