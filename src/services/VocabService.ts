import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {Language} from "@/src/models/entities/Language.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {User} from "@/src/models/entities/auth/User.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabRepo} from "@/src/models/repos/VocabRepo.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {EntityField} from "@mikro-orm/core/drivers/IDatabaseDriver.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import {escapeRegExp} from "@/src/utils/utils.js";
import {ZodEffects, ZodLiteral, ZodNativeEnum, ZodUnion} from "zod";

export class VocabService {
    em: EntityManager;
    vocabRepo: VocabRepo;

    constructor(em: EntityManager) {
        this.em = em;

        this.vocabRepo = this.em.getRepository(Vocab);
    }

    async getPaginatedVocabs(filters: { languageCode?: string, searchQuery?: string },
                             sort: { sortBy: "text" | "lessonsCount" | "learnersCount", sortOrder: "asc" | "desc" },
                             pagination: { page: number, pageSize: number }) {
        const dbFilters: FilterQuery<Vocab> = {$and: []};

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});
        if (filters.searchQuery !== undefined && filters.searchQuery !== "")
            dbFilters.$and!.push({text: {$ilike: `%${filters.searchQuery}%`}});
        const dbOrderBy: QueryOrderMap<Vocab>[] = [];
        if (sort.sortBy == "text")
            dbOrderBy.push({text: sort.sortOrder});
        else if (sort.sortBy == "learnersCount")
            dbOrderBy.push({learnersCount: sort.sortOrder});
        else if (sort.sortBy == "lessonsCount")
            dbOrderBy.push({lessonsCount: sort.sortOrder});
        dbOrderBy.push({id: "asc"});

        return await this.vocabRepo.findAndCount(dbFilters, {
            populate: ["language", "meanings", "meanings.addedBy.user", "learnersCount", "lessonsCount"],
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
    }

    async createVocab(vocabData: { text: string; language: Language; isPhrase: boolean }) {
        const newVocab = this.vocabRepo.create({
            text: vocabData.text,
            language: vocabData.language,
            isPhrase: vocabData.isPhrase,
            learnersCount: 0,
            lessonsCount: 0
        });
        await this.em.flush();
        //TODO move vocab in lesson regex somewhere centralized and test the heck out of it
        const vocabFindRegex = new RegExp(`(\\s|^)${escapeRegExp(newVocab.text)}(\\s|$)`);
        const lessonsWithVocab = await this.em.find(Lesson, {$or: [{parsedText: vocabFindRegex}, {parsedTitle: vocabFindRegex}]});
        if (lessonsWithVocab.length > 0)
            await this.em.insertMany(MapLessonVocab, lessonsWithVocab.map(lesson => ({lesson, vocab: newVocab})));
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
        }, {populate: ["meanings", "meanings.addedBy.user"]});
    }

    async getPaginatedLearnerVocabs(filters: { languageCode?: string, level?: VocabLevel[], searchQuery?: string },
                                    sort: { sortBy: "text" | "lessonsCount" | "learnersCount", sortOrder: "asc" | "desc" },
                                    pagination: { page: number, pageSize: number }, user: User): Promise<[MapLearnerVocab[], number]> {
        const dbFilters: FilterQuery<MapLearnerVocab> = {$and: []};
        dbFilters.$and!.push({learner: user.profile});

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({vocab: {language: {code: filters.languageCode}}});
        if (filters.level !== undefined)
            dbFilters.$and!.push({level: filters.level});
        if (filters.searchQuery !== undefined && filters.searchQuery !== "")
            dbFilters.$and!.push({vocab: {text: {$ilike: `%${filters.searchQuery}%`}}});
        const dbOrderBy: QueryOrderMap<MapLearnerVocab>[] = [];
        if (sort.sortBy == "text")
            dbOrderBy.push({vocab: {text: sort.sortOrder}});
        else if (sort.sortBy == "learnersCount")
            dbOrderBy.push({vocab: {learnersCount: sort.sortOrder}});
        else if (sort.sortBy == "lessonsCount")
            dbOrderBy.push({vocab: {lessonsCount: sort.sortOrder}});
        dbOrderBy.push({vocab: {id: "asc"}});

        const [mappings, totalCount] = await this.em.findAndCount(MapLearnerVocab, dbFilters, {
            populate: ["vocab", "vocab.language", "vocab.meanings", "vocab.meanings.addedBy.user"],
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
        await this.em.populate(mappings, ["vocab.learnerMeanings", "vocab.learnerMeanings.addedBy.user"], {
            where: {vocab: {learnerMeanings: {learners: user.profile}}}
        });
        return [mappings, totalCount];
    }

    async addVocabToUserLearning(vocab: Vocab, user: User, level?: VocabLevel) {
        this.em.create(MapLearnerVocab, {
            learner: user.profile,
            vocab: vocab,
            level: level
        });
        await this.em.flush();
        return (await this.getUserVocab(vocab.id, user.profile))!;
    }

    async getUserVocab(vocabId: number, learner: Profile) {
        const mapping = await this.em.findOne(MapLearnerVocab, {
            vocab: vocabId,
            learner
        }, {populate: ["vocab.meanings.learnersCount", "vocab.meanings.addedBy.user"], refresh: true});
        if (mapping) {
            await this.em.populate(mapping, ["vocab.learnerMeanings", "vocab.learnerMeanings.addedBy.user"], {where: {vocab: {learnerMeanings: {learners: learner}}}});
        }
        return mapping;
    }

    async updateUserVocab(mapping: MapLearnerVocab, updatedUserVocabData: { level?: VocabLevel; notes?: string; }) {
        if (updatedUserVocabData.level !== undefined) {
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
        return (await this.getUserVocab(mapping.vocab.id, mapping.learner))!;
    }


    async deleteUserVocab(mapping: MapLearnerVocab) {
        const meaningMappings = await this.em.find(MapLearnerMeaning, {
            learner: mapping.learner,
            meaning: {vocab: mapping.vocab}
        });
        this.em.remove(meaningMappings);
        this.em.remove(mapping);
        await this.em.flush();
    }

    async getLessonVocabs(lesson: Lesson, user: User) {
        //TODO only fetch columns89 you need, everywhere. This endpoint had performance problems when fetching everything
        const existingMappings = await this.em.find(MapLearnerVocab, {
            vocab: {lessonsAppearingIn: lesson},
            learner: user.profile
        }, {
            populate: ["vocab.language", "vocab.meanings.language", "vocab.meanings.addedBy.user"],
            fields: ["vocab.id", "vocab.text", "vocab.isPhrase", "level", "notes", "vocab.language.code", "vocab.meanings.id", "vocab.meanings.text",
                "vocab.meanings.learnersCount", "vocab.meanings.addedBy.user.username", "vocab.meanings.language.code", "vocab.meanings.addedOn",]
        });

        await this.em.populate(existingMappings, ["vocab.learnerMeanings", "vocab.learnerMeanings.language", "vocab.learnerMeanings.addedBy.user"], {
            where: {vocab: {learnerMeanings: {learners: user.profile}}},
            fields: ["vocab.learnerMeanings.id", "vocab.learnerMeanings.text", "vocab.learnerMeanings.learnersCount", "vocab.learnerMeanings.addedBy.user.username",
                "vocab.learnerMeanings.language.code", "vocab.learnerMeanings.addedOn",]
        });

        const newVocabs = await this.em.find(Vocab, {
            lessonsAppearingIn: lesson,
            $nin: existingMappings.map(m => m.vocab)
        }, {
            populate: ["language", "meanings", "meanings.language", "meanings.addedBy.user"],
            fields: ["id", "text", "isPhrase", "language.code", "meanings.id",
                "meanings.text", "meanings.learnersCount", "meanings.addedBy.user.username", "meanings.language.code", "meanings.addedOn"
            ]
        });

        return [...existingMappings, ...newVocabs];
    }

    async findVocab(where: FilterQuery<Vocab>, fields: EntityField<Vocab>[] = ["id", "language"]) {
        return await this.vocabRepo.findOne(where, {fields});
    }

    async findLearnerVocab(where: FilterQuery<MapLearnerVocab>, fields?: EntityField<MapLearnerVocab>[]) {
        return await this.em.findOne(MapLearnerVocab, where, {fields});
    }

    async getUserSavedVocabsCount(user: User, options: {
        groupBy?: "language",
        filters: { savedOnFrom?: Date, savedOnTo?: Date, levels?: VocabLevel[], isPhrase?: boolean }
    }) {
        return await this.vocabRepo.countSavedVocabs(user.profile, {groupBy: options.groupBy, filters: options.filters});
    }

    async getUserSavedVocabsCountTimeSeries(user: User, options: {
        groupBy: "language" | undefined;
        savedOnInterval: "day" | "month" | "year";
        savedOnTo: Date;
        savedOnFrom: Date,
        filters: {
            isPhrase?: boolean;
            levels?: VocabLevel[]
        };
    }) {
        return await this.vocabRepo.countSavedVocabsTimeSeries(user.profile, options);
    }


}
