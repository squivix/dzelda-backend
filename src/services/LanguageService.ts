import {Language} from "@/src/models/entities/Language.js";
import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {User} from "@/src/models/entities/auth/User.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {LanguageRepo} from "@/src/models/repos/LanguageRepo.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {EntityField} from "@mikro-orm/core/drivers/IDatabaseDriver.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";

export class LanguageService {
    em: EntityManager;
    languageRepo: LanguageRepo;

    constructor(em: EntityManager) {
        this.em = em;
        this.languageRepo = this.em.getRepository(Language);
    }

    async getLanguages(filters: { isSupported?: boolean }, sort: { sortBy: "name" | "learnersCount" | "secondSpeakersCount", sortOrder: "asc" | "desc" }) {
        const dbFilters: FilterQuery<Language> = {$and: []};
        if (filters.isSupported !== undefined)
            dbFilters.$and!.push({isSupported: filters.isSupported});

        const dbOrderBy: QueryOrderMap<Language>[] = [];
        if (sort.sortBy == "name")
            dbOrderBy.push({name: sort.sortOrder});
        else if (sort.sortBy == "learnersCount")
            dbOrderBy.push({learnersCount: sort.sortOrder});
        else if (sort.sortBy == "secondSpeakersCount")
            dbOrderBy.push({secondSpeakersCount: sort.sortOrder});

        dbOrderBy.push({code: "asc"});
        dbOrderBy.push({id: "asc"});
        return await this.languageRepo.find(dbFilters, {
            populate: ["learnersCount"],
            orderBy: dbOrderBy,
        });
    }

    async getUserLanguages(user: User, filters: {}, sort: { sortBy: "name" | "learnersCount" | "lastOpened", sortOrder: "asc" | "desc" }) {
        const dbFilters: FilterQuery<MapLearnerLanguage> = {$and: []};
        dbFilters.$and!.push({learner: user.profile});

        const dbOrderBy: QueryOrderMap<MapLearnerLanguage>[] = [];
        if (sort.sortBy == "name")
            dbOrderBy.push({language: {name: sort.sortOrder}});
        else if (sort.sortBy == "learnersCount")
            dbOrderBy.push({language: {learnersCount: sort.sortOrder}});
        else if (sort.sortBy == "lastOpened")
            dbOrderBy.push({lastOpened: sort.sortOrder});

        dbOrderBy.push({language: {code: "asc"}});
        dbOrderBy.push({language: {id: "asc"}});
        return await this.em.find(MapLearnerLanguage, dbFilters, {orderBy: dbOrderBy, populate: ["preferredTtsVoice"]});
    }

    async getUserLanguage(code: string, user: User) {
        return await this.em.findOne(MapLearnerLanguage, {language: {code}, learner: user.profile}, {populate: ["preferredTtsVoice"]});
    }

    async updateUserLanguage(languageMapping: MapLearnerLanguage) {
        await this.languageRepo.updateUserLanguageTimeStamp(languageMapping);
        return (await this.em.refresh(languageMapping, {populate: ["preferredTtsVoice"]}))!;
    }


    async addLanguageToUser(user: User, language: Language) {
        const mapping = this.em.create(MapLearnerLanguage, {learner: user.profile, language: language});
        await this.em.flush();
        //TODO test this
        const defaultDictionaries = await this.em.find(Dictionary, {isDefault: true, language: language}, {orderBy: [{name: "asc"}, {id: "asc"}]});
        await this.em.insertMany(MapLearnerDictionary, defaultDictionaries.map((d, i) => ({learner: user.profile.id, dictionary: d.id, order: i})));
        await this.em.refresh(mapping.language);
        return mapping;
    }

    async removeLanguageFromUser(languageMapping: MapLearnerLanguage) {
        const learner = languageMapping.learner;
        const language = languageMapping.language;
        const dictionaryMappings = await this.em.find(MapLearnerDictionary, {learner, dictionary: {language}});
        const vocabMappings = await this.em.find(MapLearnerVocab, {learner, vocab: {language}});
        const meaningMappings = await this.em.find(MapLearnerMeaning, {learner, meaning: {vocab: {language}}});

        this.em.remove(languageMapping);
        this.em.remove(dictionaryMappings);
        this.em.remove(vocabMappings);
        this.em.remove(meaningMappings);
        await this.em.flush();
    }

    async findLanguage(where: FilterQuery<Language>, fields: EntityField<Language>[] = ["id", "code", "isSupported"]) {
        return await this.languageRepo.findOne(where, {fields});
    }
}
