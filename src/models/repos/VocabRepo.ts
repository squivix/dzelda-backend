import {EntityRepository} from "@mikro-orm/postgresql";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";

export class VocabRepo extends EntityRepository<Vocab> {
    async countSavedVocabs(learner: Profile, {groupBy, filters}: {
        groupBy?: "language",
        filters: {
            savedOnFrom?: Date;
            savedOnTo?: Date;
            levels?: VocabLevel[],
            isPhrase?: boolean
        }
    }) {
        const knex = this.em.getKnex();
        const queryBuilder = knex.queryBuilder();
        queryBuilder
            .select(this.em.getKnex().raw("COALESCE(COUNT(map_learner_vocab.id), 0)::int AS \"vocabsCount\""))
            .from("map_learner_language")
            .leftJoin("language", "map_learner_language.language_id", "language.id")
            .leftJoin("vocab", "vocab.language_id", "language.id")
            .leftJoin("map_learner_vocab", (join) => {
                join.on("map_learner_vocab.vocab_id", "vocab.id")
                    .andOn("map_learner_vocab.learner_id", "=", knex.raw(learner.id));
                if (Array.isArray(filters.levels) && filters.levels.length > 0)
                    join.andOnIn("map_learner_vocab.level", filters.levels);
                if (filters.savedOnFrom)
                    join.andOn("map_learner_vocab.saved_on", ">", knex.raw("date ?", filters.savedOnFrom.toISOString()));
                if (filters.savedOnTo)
                    join.andOn("map_learner_vocab.saved_on", "<", knex.raw("date ?", filters.savedOnTo.toISOString()));
                if (filters.isPhrase !== undefined)
                    join.andOnVal("vocab.is_phrase", "=", filters.isPhrase);
            })
            .where("map_learner_language.learner_id", learner.id);
        if (groupBy === "language") {
            queryBuilder.select("language.name AS language")
                .groupBy("language.id")
                .orderBy("language.name");
        }

        return await this.em.execute(queryBuilder);
    }

    async countSavedVocabsTimeSeries(learner: Profile, {savedOnFrom, savedOnTo, savedOnInterval, filters, groupBy}: {
        savedOnFrom: Date;
        savedOnTo: Date;
        savedOnInterval: "day" | "month" | "year";
        groupBy?: "language",
        filters: {
            isPhrase?: boolean;
            levels?: VocabLevel[]
        };
    }) {
        const dateFormatMap = {"day": "YYYY-MM-DD", month: "YYYY-MM", "year": "YYYY"};
        const dateFormat = dateFormatMap[savedOnInterval];// == "day" ? "YYYY-MM-DD" : savedOnInterval == "month" ? "YYYY-MM" : "YYYY";
        const knex = this.em.getKnex();
        const queryBuilder = knex.queryBuilder();
        queryBuilder.with("full_time_series", (qb) => {
            qb.select(knex.raw("TO_CHAR(d::date, ?) AS date", dateFormat))
                .from(knex.raw("generate_series(date ?, date ?, ?) AS gs(d)", [
                    savedOnFrom.toISOString(),
                    savedOnTo.toISOString(),
                    `1 ${savedOnInterval}`
                ]));
        })
            .with("languages_learning_by_date", (qb) => {
                qb.select("full_time_series.date AS date", "language.id AS language_id")
                    .from("full_time_series")
                    .crossJoin(knex.raw("language"))
                    .leftJoin("map_learner_language", "map_learner_language.language_id", "language.id")
                    .where("map_learner_language.learner_id", learner.id);
            })
            .select(
                "languages_learning_by_date.date",
                knex.raw("COALESCE(COUNT(vocab.id), 0)::int AS \"vocabsCount\"")
            )
            .from("map_learner_vocab")
            .rightJoin("languages_learning_by_date", (join) => {
                join.on(knex.raw("languages_learning_by_date.date = TO_CHAR(map_learner_vocab.saved_on, ?)", [dateFormat]))
                    .andOnVal("map_learner_vocab.learner_id", learner.id);
                if (Array.isArray(filters.levels) && filters.levels.length > 0)
                    join.andOnIn("map_learner_vocab.level", filters.levels);
            })
            .leftJoin("language", "languages_learning_by_date.language_id", "language.id")
            .leftJoin("vocab", (join) => {
                join.on("vocab.id", "map_learner_vocab.vocab_id")
                    .andOn("languages_learning_by_date.language_id", "vocab.language_id");
                if (filters.isPhrase !== undefined)
                    join.andOnVal("vocab.is_phrase", "=", filters.isPhrase);
            })
            .groupBy("languages_learning_by_date.date")
            .orderBy("languages_learning_by_date.date");
        if (groupBy == "language") {
            queryBuilder
                .select("language.name AS language")
                .groupBy("languages_learning_by_date.language_id", "language.name")
                .orderBy("language.name");
        }

        return await this.em.execute(queryBuilder);
    }

}
