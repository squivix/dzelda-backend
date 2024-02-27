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
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";
import {PreferredTranslationLanguageEntry} from "@/src/models/entities/PreferredTranslationLanguageEntry.js";

export class LanguageService {
    em: EntityManager;
    languageRepo: LanguageRepo;

    constructor(em: EntityManager) {
        this.em = em;
        this.languageRepo = this.em.getRepository(Language);
    }

    async getLanguages(sort: { sortBy: "name" | "learnersCount" | "secondSpeakersCount", sortOrder: "asc" | "desc" }) {
        const dbOrderBy: QueryOrderMap<Language>[] = [];
        if (sort.sortBy == "name")
            dbOrderBy.push({name: sort.sortOrder});
        else if (sort.sortBy == "learnersCount")
            dbOrderBy.push({learnersCount: sort.sortOrder});
        else if (sort.sortBy == "secondSpeakersCount")
            dbOrderBy.push({secondSpeakersCount: sort.sortOrder});

        dbOrderBy.push({code: "asc"});
        dbOrderBy.push({id: "asc"});
        return await this.languageRepo.find({}, {
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

        return await this.em.find(MapLearnerLanguage, dbFilters, {orderBy: dbOrderBy, populate: ["preferredTtsVoice", "preferredTranslationLanguages.translationLanguage"]});
    }

    async getUserLanguage(code: string, user: User) {
        return await this.em.findOne(MapLearnerLanguage, {language: {code}, learner: user.profile}, {populate: ["preferredTtsVoice", "preferredTranslationLanguages.translationLanguage"]});
    }

    async updateUserLanguage(languageMapping: MapLearnerLanguage, updateFields: { lastOpened: "now" | undefined, preferredTranslationLanguages?: TranslationLanguage[] }) {
        if (updateFields.preferredTranslationLanguages !== undefined) {
            const preferredTranslationLanguages = updateFields.preferredTranslationLanguages;
            await this.em.transactional(async (tm) => {
                await tm.nativeDelete(PreferredTranslationLanguageEntry, {learnerLanguageMapping: languageMapping, translationLanguage: {$nin: preferredTranslationLanguages.map(t => t.id)}});
                await tm.upsertMany(PreferredTranslationLanguageEntry, preferredTranslationLanguages.map((tl, i) => ({
                    learnerLanguageMapping: languageMapping,
                    translationLanguage: tl,
                    precedenceOrder: i
                })));
            });
        }
        if (updateFields.lastOpened !== undefined)
            await this.languageRepo.updateUserLanguageTimeStamp(languageMapping);
        return (await this.em.refresh(languageMapping, {populate: ["preferredTtsVoice", "preferredTranslationLanguages.translationLanguage"]}))!;
    }


    async addLanguageToUser({user, language, preferredTranslationLanguages}: { user: User, language: Language, preferredTranslationLanguages?: TranslationLanguage[] }) {
        const mapping = this.em.create(MapLearnerLanguage, {learner: user.profile, language: language});
        await this.em.flush();
        //TODO test this
        const defaultDictionaries = await this.em.find(Dictionary, {isDefault: true, language: language}, {orderBy: [{name: "asc"}, {id: "asc"}]});
        await this.em.insertMany(MapLearnerDictionary, defaultDictionaries.map((d, i) => ({learner: user.profile.id, dictionary: d.id, order: i})));
        const defaultTranslationLanguages = await this.em.find(TranslationLanguage, {isDefault: true});
        preferredTranslationLanguages = preferredTranslationLanguages ?? defaultTranslationLanguages;
        await this.em.insertMany(PreferredTranslationLanguageEntry, preferredTranslationLanguages.map((t, i) => ({
            learnerLanguageMapping: mapping,
            translationLanguage: t,
            precedenceOrder: i
        })));
        await this.em.refresh(mapping.language);
        return mapping;
    }

    async removeLanguageFromUser(languageMapping: MapLearnerLanguage) {
        const learner = languageMapping.learner;
        const language = languageMapping.language;
        await this.em.transactional(async (tm) => {
            await tm.nativeDelete(MapLearnerLanguage, {id: languageMapping.id});
            await tm.nativeDelete(MapLearnerDictionary, {learner, dictionary: {language}});
            await tm.nativeDelete(MapLearnerVocab, {learner, vocab: {language}});
            await tm.nativeDelete(MapLearnerMeaning, {learner, meaning: {vocab: {language}}});
        });
    }

    async getTranslationLanguages() {
        return await this.em.find(TranslationLanguage, {}, {orderBy: {name: "asc"}});
    }

    async findLearningLanguage(where: FilterQuery<Language>, fields: EntityField<Language>[] = ["id", "code"]) {
        return await this.em.findOne(Language, where, {fields: fields as any});
    }

    async findTranslationLanguage(where: FilterQuery<TranslationLanguage>, fields: EntityField<TranslationLanguage>[] = ["id", "code"]) {
        return await this.em.findOne(TranslationLanguage, where, {fields: fields as any});
    }

    async findTranslationLanguages(where: FilterQuery<TranslationLanguage>, fields: EntityField<TranslationLanguage>[] = ["id", "code"]) {
        return await this.em.find(TranslationLanguage, where, {fields: fields as any});
    }
}
