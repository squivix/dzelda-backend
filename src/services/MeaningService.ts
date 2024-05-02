import {EntityManager, EntityRepository, FilterQuery} from "@mikro-orm/core";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {User} from "@/src/models/entities/auth/User.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabLevel} from "dzelda-common";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";

export class MeaningService {

    em: EntityManager;
    meaningRepo: EntityRepository<Meaning>;

    constructor(em: EntityManager) {
        this.em = em;

        this.meaningRepo = this.em.getRepository(Meaning);
    }

    async getMeaningByText(meaningData: { vocab: Vocab; language: TranslationLanguage; text: string }) {
        return await this.meaningRepo.findOne({
            vocab: meaningData.vocab,
            text: meaningData.text,
            language: meaningData.language
        }, {populate: ["addedBy.user", "vocab.language"]});
    }

    async createMeaning(meaningData: { vocab: Vocab; language: TranslationLanguage; text: string }, user: User) {
        const newMeaning = this.meaningRepo.create({
            text: meaningData.text,
            language: meaningData.language,
            vocab: meaningData.vocab,
            addedBy: user.profile,
            learnersCount: 0
        });
        await this.em.flush();
        await this.em.populate(newMeaning, ["addedBy.user", "vocab.language"]);
        return newMeaning;
    }

    async getUserMeanings(filters: { vocabId?: number },
                          sort: { sortBy: "text" | "learnersCount", sortOrder: "asc" | "desc" },
                          pagination: { page: number, pageSize: number },
                          user: User): Promise<[Meaning[], number]> {
        const dbFilters: FilterQuery<Meaning> = {$and: []};
        dbFilters.$and!.push({learners: user.profile});
        if (filters.vocabId)
            dbFilters.$and!.push({vocab: filters.vocabId});

        const dbOrderBy: QueryOrderMap<Meaning>[] = [];
        if (sort.sortBy == "text")
            dbOrderBy.push({text: sort.sortOrder});
        else if (sort.sortBy == "learnersCount")
            dbOrderBy.push({learnersCount: sort.sortOrder});

        return await this.meaningRepo.findAndCount(dbFilters, {
            populate: ["language", "vocab.language", "addedBy.user", "learnersCount"],
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
    }

    async getUserMeaning(meaningId: number, user: User) {
        return await this.em.findOne(MapLearnerMeaning, {meaning: meaningId, learner: user.profile});
    }

    async getMeaning(meaningId: number) {
        return await this.meaningRepo.findOne({id: meaningId}, {populate: ["language", "vocab.language", "addedBy.user", "learnersCount"]});
    }

    async addMeaningToUserLearning(meaning: Meaning, user: User) {
        const mapping = this.em.create(MapLearnerMeaning, {learner: user.profile, meaning: meaning});
        await this.em.flush();
        await this.em.nativeUpdate(MapLearnerVocab, {
            learner: user.profile,
            vocab: meaning.vocab,
            level: {$in: [VocabLevel.LEARNED, VocabLevel.KNOWN, VocabLevel.IGNORED]}
        }, {level: VocabLevel.LEVEL_1});
        await this.em.refresh(mapping.meaning);
        return mapping;
    }

    async removeMeaningFromUser(meaningMapping: MapLearnerMeaning) {
        this.em.remove(meaningMapping);
        await this.em.flush();
    }
}
