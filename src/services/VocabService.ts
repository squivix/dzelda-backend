import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {Language} from "@/src/models/entities/Language.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabRepo} from "@/src/models/repos/VocabRepo.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";

export class VocabService {
    em: EntityManager;
    vocabRepo: VocabRepo;

    constructor(em: EntityManager) {
        this.em = em;

        this.vocabRepo = this.em.getRepository(Vocab);
    }

    async getVocabs(filters: { languageCode?: string, searchQuery?: string },
                    sort: { sortBy: "text" | "lessonsCount" | "learnersCount", sortOrder: "asc" | "desc" },
                    pagination: { page: number, pageSize: number }, user: User | AnonymousUser | null) {
        const dbFilters: FilterQuery<Vocab> = {$and: []};

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});
        if (filters.searchQuery !== undefined)
            dbFilters.$and!.push({text: {$ilike: `%${filters.searchQuery}%`}});

        const dbOrderBy: QueryOrderMap<Vocab>[] = [];
        if (sort.sortBy == "text")
            dbOrderBy.push({text: sort.sortOrder});
        else if (sort.sortBy == "learnersCount")
            dbOrderBy.push({learnersCount: sort.sortOrder});
        else if (sort.sortBy == "lessonsCount")
            dbOrderBy.push({lessonsCount: sort.sortOrder});
        dbOrderBy.push({id: "asc"});

        return await this.vocabRepo.find(dbFilters, {
            populate: ["language", "meanings", "meanings.addedBy.user", "learnersCount", "lessonsCount"],
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
    }

    async countVocabs(filters: { languageCode?: string, searchQuery?: string }) {
        const dbFilters: FilterQuery<Vocab> = {$and: []};
        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});
        if (filters.searchQuery !== undefined)
            dbFilters.$and!.push({text: {$ilike: `%${filters.searchQuery}%`}});
        return await this.vocabRepo.count(dbFilters);
    }

    async createVocab(vocabData: { text: string; language: Language; isPhrase: boolean }) {
        const newVocab = await this.vocabRepo.create({
            text: vocabData.text,
            language: vocabData.language,
            isPhrase: vocabData.isPhrase,
            learnersCount: 0,
            lessonsCount: 0
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

    async addVocabToUserLearning(vocab: Vocab, user: User) {
        const mapping = this.em.create(MapLearnerVocab, {
            learner: user.profile,
            vocab: vocab
        });
        await this.em.flush();
        await this.vocabRepo.annotateUserMeanings([mapping], user.profile.id);
        return mapping;
    }

    async getUserVocab(vocabId: number, user: User) {
        const mapping = await this.em.findOne(MapLearnerVocab, {
            vocab: vocabId,
            learner: {user: {username: user.username}}
        }, {populate: ["vocab.meanings"], refresh: true});
        if (mapping)
            await this.vocabRepo.annotateUserMeanings([mapping], user.profile.id);
        return mapping;
    }

    async updateUserVocab(mapping: MapLearnerVocab, updatedUserVocabData: { level?: VocabLevel; notes?: string; }) {
        if (updatedUserVocabData.level !== undefined) {
            //TODO
            mapping.level = updatedUserVocabData.level;
            if (updatedUserVocabData.level == VocabLevel.IGNORED) {
                const meaningMappings = await this.em.find(MapLearnerMeaning, {
                    learner: mapping.learner,
                    meaning: {vocab: mapping.vocab}
                });
                this.em.remove(meaningMappings);
                mapping.notes = "";
            }
        }
        if (updatedUserVocabData.notes !== undefined && updatedUserVocabData.level !== VocabLevel.IGNORED)
            mapping.notes = updatedUserVocabData.notes;

        this.em.persist(mapping);
        await this.em.flush();
        return await this.getUserVocab(mapping.vocab.id, mapping.learner.user);
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
