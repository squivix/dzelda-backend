import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";
import {Language} from "@/src/models/entities/Language.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";

export class PronunciationService {
    em: EntityManager;

    constructor(em: EntityManager) {
        this.em = em;
    }


    async getPaginatedHumanPronunciations(filters: { text?: string, languageCode?: string },
                                          pagination: { page: number, pageSize: number }) {
        const dbFilters: FilterQuery<HumanPronunciation> = {$and: []};
        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});

        //TODO replace with full text search and allow for non exact matches
        if (filters.text !== undefined)
            dbFilters.$and!.push({parsedText: {$ilike: filters.text}});

        return await this.em.findAndCount(HumanPronunciation, dbFilters, {
            populate: ["language", "attributionSource"],
            orderBy: {id: "asc"},
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
    }

    async getHumanPronunciations(text: string, language: Language) {
        return await this.em.find(HumanPronunciation, {
            parsedText: {$ilike: text},
            language: language
        });
    }

    async getVocabTTSPronunciations(vocab: Vocab) {
        return await this.em.find(TTSPronunciation, {vocab}, {populate: ["voice"]});
    }
}
