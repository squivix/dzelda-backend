import {EntityRepository} from "@mikro-orm/postgresql";
import {Text} from "@/src/models/entities/Text.js";
import {VocabLevel} from "dzelda-common";
import {numericEnumValues} from "@/src/utils/utils.js";
import {User} from "@/src/models/entities/auth/User.js";

export type TextAnnotatedField = "vocabsByLevel" | "isBookmarked";

export class TextRepo extends EntityRepository<Text> {
    async annotateTextsWithUserData(texts: Text[], user: User, fields: TextAnnotatedField[] = ["vocabsByLevel", "isBookmarked"]) {
        const fieldSet = new Set(fields);
        if (fieldSet.has("vocabsByLevel"))
            await this.annotateVocabsByLevel(texts, user.profile.id);
        if (fieldSet.has("isBookmarked"))
            await this.annotateIsBookmarked(texts, user.profile.id);
        await this.annotateVocabsByLevel(texts, user.profile.id);
        await this.annotateIsBookmarked(texts, user.profile.id);
    }

    async annotateVocabsByLevel(texts: Text[], learnerId: number) {
        if (texts.length === 0)
            return texts;
        const query = `SELECT json_object_agg(outq.id, outq.vocabLevels) AS vocab_levels_by_text
                       FROM (SELECT subq.text_id                                         AS id,
                                    json_object_agg(COALESCE(subq.level, 0), subq.count) AS vocabLevels
                             FROM (SELECT mlv.level,
                                          COUNT(*),
                                          mtv.text_id
                                   FROM map_text_vocab mtv
                                            LEFT JOIN map_learner_vocab mlv on mtv.vocab_id = mlv.vocab_id AND mlv.learner_id = ${learnerId}
                                   WHERE mtv.text_id IN (${texts.map(t => t.id).join(",")})
                                   GROUP BY mtv.text_id, mlv.level
                                   ORDER BY mtv.text_id) AS subq
                             GROUP BY subq.text_id) as outq`;

        const vocabsLevelsByText = (await this.em.execute(query))[0].vocab_levels_by_text;
        const defaultCounts = numericEnumValues(VocabLevel).reduce((a, v) => ({...a, [v]: 0}), {});
        texts.forEach(text => text.vocabsByLevel = Object.assign({}, defaultCounts, vocabsLevelsByText?.[text.id] ?? {}));
        return texts;
    }

    async annotateIsBookmarked(texts: Text[], learnerId: number) {
        if (texts.length === 0)
            return texts;
        const query = `SELECT json_object_agg(text_id, true) AS text_id_to_is_bookmarked
                       FROM text_bookmark
                       WHERE bookmarker_id = ${learnerId}
                         and text_id IN (${texts.map(t => t.id).join(",")});`;
        const textIdToIsBookmarked = (await this.em.execute(query))[0].text_id_to_is_bookmarked;
        texts.forEach(collection => collection.isBookmarked = textIdToIsBookmarked?.[collection.id] ?? false);
        return texts;
    }

}
