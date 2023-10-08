import {EntityRepository} from "@mikro-orm/postgresql";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {numericEnumValues} from "@/src/utils/utils.js";
import {Course} from "@/src/models/entities/Course.js";
import {User} from "@/src/models/entities/auth/User.js";

export class LessonRepo extends EntityRepository<Lesson> {
    async annotateLessonsWithUserData(lessons: Lesson[], user: User) {
        await this.annotateVocabsByLevel(lessons, user.profile.id);
    }

    private async annotateVocabsByLevel(lessons: Lesson[], learnerId: number) {
        if (lessons.length === 0)
            return lessons;
        const query = `SELECT json_object_agg(outq.id, outq.vocabLevels) AS vocab_levels_by_lesson
FROM (SELECT subq.lesson_id                                                   AS id,
             json_object_agg(COALESCE(subq.level, 0), subq.count) AS vocabLevels
      FROM (SELECT mlv2.level,
                   COUNT(*),
                   mlv.lesson_id
            FROM map_lesson_vocab mlv
                     LEFT JOIN map_learner_vocab mlv2 on mlv.vocab_id = mlv2.vocab_id AND mlv2.learner_id = ${learnerId}
            WHERE mlv.lesson_id IN (${lessons.map(l=>l.id).join(",")})
            GROUP BY mlv.lesson_id, mlv2.level
            ORDER BY mlv.lesson_id) AS subq
      GROUP BY subq.lesson_id) as outq`;

        const vocabsLevelsByLesson = (await this.em.execute(query))[0].vocab_levels_by_lesson;
        const defaultCounts = numericEnumValues(VocabLevel).reduce((a, v) => ({...a, [v]: 0}), {});
        lessons.forEach(lesson => lesson.vocabsByLevel = Object.assign({}, defaultCounts, vocabsLevelsByLesson?.[lesson.id] ?? {}));
        return lessons;
    }

}
