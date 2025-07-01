import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";
import {Language} from "@/src/models/entities/Language.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {buildFetchPlan, ViewDescription} from "@/src/models/viewResolver.js";
import {humanPronunciationFetchSpecs} from "@/src/models/fetchSpecs/humanPronunciationFetchSpecs.js";
import {ttsPronunciationFetchSpecs} from "@/src/models/fetchSpecs/ttsPronunciationFetchSpecs.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";

export class PronunciationService {
    em: EntityManager;

    constructor(em: EntityManager) {
        this.em = em;
    }


    async getPaginatedHumanPronunciations(filters: { text?: string, languageCode?: string },
                                          pagination: { page: number, pageSize: number }, viewDescription: ViewDescription) {
        const dbFilters: FilterQuery<HumanPronunciation> = {$and: []};
        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});

        //TODO replace with full text search and allow for non exact matches
        if (filters.text !== undefined)
            dbFilters.$and!.push({parsedText: {$ilike: filters.text}});

        const {fields: dbFields, populate: dbPopulate} = buildFetchPlan(viewDescription, humanPronunciationFetchSpecs(), {user: null, em: this.em});
        return await this.em.findAndCount(HumanPronunciation, dbFilters, {
            fields: dbFields as any,
            populate: dbPopulate as any,
            orderBy: {id: "asc"},
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
    }

    async getHumanPronunciations(text: string, language: Language, viewDescription: ViewDescription) {
        const {fields: dbFields, populate: dbPopulate} = buildFetchPlan(viewDescription, humanPronunciationFetchSpecs(), {user: null, em: this.em});
        return await this.em.find(HumanPronunciation, {
            parsedText: {$ilike: text},
            language: language
        }, {
            fields: dbFields as any,
            populate: dbPopulate as any
        });
    }

    async getVocabTTSPronunciations(vocab: Vocab, viewDescription: ViewDescription) {
        const {fields: dbFields, populate: dbPopulate} = buildFetchPlan(viewDescription, ttsPronunciationFetchSpecs(), {user: null, em: this.em});
        return await this.em.find(TTSPronunciation, {vocab}, {
            fields: dbFields as any,
            populate: dbPopulate as any
        });
    }

    async getTTSPronunciation(id: number, viewDescription: ViewDescription) {
        const {fields: dbFields, populate: dbPopulate} = buildFetchPlan(viewDescription, ttsPronunciationFetchSpecs(), {user: null, em: this.em});
        return await this.em.findOne(TTSPronunciation, {id}, {
            fields: dbFields as any,
            populate: dbPopulate as any,
            refresh: true
        })
    }


    async findTTSPronunciation(where: FilterQuery<TTSPronunciation>) {
        return this.em.findOne(TTSPronunciation, where);
    }
}
