import {Language} from "@/src/models/entities/Language.js";
import {EntityManager, EntityRepository} from "@mikro-orm/core";
import {User} from "@/src/models/entities/auth/User.js";
import {cleanObject} from "@/src/utils/utils.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {languageSerializer} from "@/src/schemas/response/serializers/LanguageSerializer.js";

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
        return languageSerializer.serializeList(languages);
    }

    async getUserLanguages(user: User, filters: {}) {
        const languages = await this.languageRepo.find({learners: user.profile, ...filters});
        await this.em.flush();
        return languageSerializer.serializeList(languages);
    }

    async getLanguage(code: string) {
        const language = await this.languageRepo.findOne({code});
        await this.em.flush();
        return language;
    }


    async addLanguageToUser(user: User, language: Language) {
        const mapping = new MapLearnerLanguage(user.profile, language);
        await this.em.persist(mapping);
        await this.em.flush();
        return languageSerializer.serialize(await this.languageRepo.findOneOrFail(language, {refresh: true}));
    }

}

export default LanguageService;