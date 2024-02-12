import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";
import {Language} from "@/src/models/entities/Language.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";

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
        if (filters.text !== undefined)
            dbFilters.$and!.push({parsedText: {$ilike: filters.text}});

        return await this.em.findAndCount(HumanPronunciation, dbFilters, {
            populate: ["language"],
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
}
