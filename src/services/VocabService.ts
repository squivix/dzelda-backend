import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {Language} from "@/src/models/entities/Language.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabRepo} from "@/src/models/repos/VocabRepo.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {Lesson} from "@/src/models/entities/Lesson.js";

export class VocabService {
    em: EntityManager;
    vocabRepo: VocabRepo;

    constructor(em: EntityManager) {
        this.em = em;

        this.vocabRepo = this.em.getRepository(Vocab);
    }

    async getVocabs(filters: {}, user: User | AnonymousUser | null) {
        const dbFilters: FilterQuery<Vocab> = {$and: []};
        return await this.vocabRepo.find(dbFilters, {populate: ["meanings"]});
    }

    async createVocab(vocabData: { text: string; language: Language; isPhrase: boolean }) {
        const newVocab = await this.vocabRepo.create({
            text: vocabData.text,
            language: vocabData.language,
            isPhrase: vocabData.isPhrase
        });
        await this.em.flush();
        return newVocab;
    }

    async getVocab(vocabId: number) {
        return await this.vocabRepo.findOne({
            id: vocabId
        }, {populate: ["meanings"]});
    }

    async getVocabByText(vocabData: { text: string; language: Language }) {
        return await this.vocabRepo.findOne({
            text: vocabData.text,
            language: vocabData.language
        }, {populate: ["meanings"]});
    }

    async getUserVocabs(filters: { languageCode?: string, level?: VocabLevel, searchQuery?: string }, user: User) {
        const dbFilters: FilterQuery<MapLearnerVocab> = {$and: []};
        dbFilters.$and!.push({learner: user.profile});

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({vocab: {language: {code: filters.languageCode}}});
        if (filters.level !== undefined)
            dbFilters.$and!.push({level: filters.level});
        if (filters.searchQuery !== undefined)
            dbFilters.$and!.push({vocab: {text: {$ilike: `%${filters.searchQuery}%`}}});

        const mappings = await this.em.find(MapLearnerVocab, dbFilters, {populate: ["vocab", "vocab.language", "vocab.meanings"]});
        await this.vocabRepo.annotateUserMeanings(mappings, user.profile.id);
        return mappings;
    }

    async getUserVocab(vocabId: number, user: User) {
        const mapping = await this.em.findOne(MapLearnerVocab, {
            vocab: vocabId,
            learner: {user: {username: user.username}}
        }, {populate: ["vocab.meanings"]});
        if (mapping)
            await this.vocabRepo.annotateUserMeanings([mapping], user.profile.id);
        return mapping;
    }

    async updateUserVocab(mapping: MapLearnerVocab, updatedUserVocabData: { level?: VocabLevel; notes?: string; }) {
        if (updatedUserVocabData.level !== undefined)
            mapping.level = updatedUserVocabData.level;
        if (updatedUserVocabData.notes !== undefined)
            mapping.notes = updatedUserVocabData.notes;

        this.em.persist(mapping);
        await this.em.flush();
        return mapping;
    }

    async getLessonVocabs(lesson: Lesson, user: User) {
        const existingMappings = await this.em.find(MapLearnerVocab, {
            vocab: {lessonsAppearingIn: lesson},
            learner: {user: user}
        }, {populate: ["vocab.meanings"]});
        await this.vocabRepo.annotateUserMeanings(existingMappings, user.profile.id);

        const newVocabs = await this.em.find(Vocab, {
            lessonsAppearingIn: lesson,
            $not: {learners: {user: user}}
        }, {populate: ["meanings"]});

        return [...existingMappings, ...newVocabs];
    }
}