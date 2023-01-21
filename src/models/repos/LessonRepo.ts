import {EntityRepository} from "@mikro-orm/postgresql";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {numericEnumValues} from "@/src/utils/utils.js";

export class LessonRepo extends EntityRepository<Lesson> {

    async annotateVocabsByLevel(lessons: Lesson[], userId: number) {
        const query = `SELECT json_object_agg(outq.id, outq.vocabLevels) AS vocab_levels_by_lesson
FROM (SELECT subq.lesson_id                          AS id,
             json_object_agg(subq.level, subq.count) AS vocabLevels
      FROM (SELECT mlv2.level,
                   COUNT(mlv2.level),
                   mlv.lesson_id
            FROM map_lesson_vocab mlv
                     LEFT JOIN map_learner_vocab mlv2 on mlv.vocab_id = mlv2.vocab_id AND mlv2.learner_id = ${userId}
            WHERE mlv2.level IS NOT NULL AND mlv.lesson_id IN (${lessons.map(l=>l.id).join(",")})
            GROUP BY mlv.lesson_id, mlv2.level
            ORDER BY mlv.lesson_id) AS subq
      GROUP BY subq.lesson_id) as outq`;

        const vocabsLevelsByLesson = (await this.em.execute(query))[0].vocab_levels_by_lesson
        const defaultCounts = numericEnumValues(VocabLevel).reduce((a, v) => ({...a, [v]: 0}), {})
        lessons.forEach(lesson => {
            lesson.vocabsByLevel = Object.assign({}, defaultCounts, vocabsLevelsByLesson?.[lesson.id] ?? {});
        })
        return lessons;
    }

}