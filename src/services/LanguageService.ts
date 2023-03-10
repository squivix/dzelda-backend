import {Language} from "@/src/models/entities/Language.js";
import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {User} from "@/src/models/entities/auth/User.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {LanguageRepo} from "@/src/models/repos/LanguageRepo.js";
import {MapLearnerLesson} from "@/src/models/entities/MapLearnerLesson.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";

export class LanguageService {
    em: EntityManager;
    languageRepo: LanguageRepo;

    constructor(em: EntityManager) {
        this.em = em;
        this.languageRepo = this.em.getRepository(Language);
    }

    async getLanguages(filters: { isSupported?: boolean }) {
        const dbFilters: FilterQuery<Language> = {$and: []};
        if (filters.isSupported !== undefined)
            dbFilters.$and!.push({isSupported: filters.isSupported});
        return await this.languageRepo.find(filters, {populate: ["learnersCount"]});
    }

    async getUserLanguages(user: User, filters: {}) {
        return await this.languageRepo.find({learners: user.profile, ...filters});
    }

    async getUserLanguage(code: string, user: User) {
        return await this.em.findOne(MapLearnerLanguage, {language: {code}, learner: user.profile});
    }

    async updateUserLanguage(languageMapping: MapLearnerLanguage) {
        return await this.languageRepo.updateUserLanguageTimeStamp(languageMapping);
    }

    async getLanguage(code: string) {
        const language = await this.languageRepo.findOne({code});
        await this.em.flush();
        return language;
    }


    async addLanguageToUser(user: User, language: Language) {
        const mapping = this.em.create(MapLearnerLanguage, {learner: user.profile, language: language});
        await this.em.flush();
        await this.em.refresh(mapping.language);
        return mapping;
    }

    async removeLanguageFromUser(languageMapping: MapLearnerLanguage) {
        const learner = languageMapping.learner;
        const language = languageMapping.language;
        const lessonMappings = await this.em.find(MapLearnerLesson, {learner, lesson: {course: {language}}});
        const dictionaryMappings = await this.em.find(MapLearnerDictionary, {learner, dictionary: {language}});
        const vocabMappings = await this.em.find(MapLearnerVocab, {learner, vocab: {language}});
        const meaningMappings = await this.em.find(MapLearnerMeaning, {learner, meaning: {vocab: {language}}});

        this.em.remove(languageMapping);
        this.em.remove(lessonMappings);
        this.em.remove(dictionaryMappings);
        this.em.remove(vocabMappings);
        this.em.remove(meaningMappings);
        await this.em.flush();
    }
}
