import {EntityRepository} from "@mikro-orm/postgresql";
import {defaultVocabsByLevel, VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {numericEnumValues} from "@/src/utils/utils.js";
import {Course} from "@/src/models/entities/Course.js";
import CourseService from "@/src/services/CourseService.js";

export class CourseRepo extends EntityRepository<Course> {

    async annotateVocabsByLevel(courses: Course[], userId: number) {
        if (courses.length === 0)
            return courses;
        const query = `SELECT json_object_agg(outq.id, outq.vocab_levels) AS vocab_levels_by_course
FROM (SELECT subq.course_id                          AS id,
             json_object_agg(COALESCE(subq.level, 0), subq.count) AS vocab_levels
      FROM (SELECT lesson.course_id,
                   mlv2.level,
                   COUNT(*)
            FROM map_lesson_vocab mlv
                     LEFT JOIN map_learner_vocab mlv2 on mlv.vocab_id = mlv2.vocab_id AND mlv2.learner_id = ${userId}
                     LEFT JOIN lesson on mlv.lesson_id = lesson.id
            WHERE lesson.course_id IN (${courses.map(c=>c.id).join(",")})
            GROUP BY lesson.course_id, mlv2.level
            ORDER BY lesson.course_id) AS subq
      GROUP BY subq.course_id) as outq`;

        const vocabsLevelsByCourse = (await this.em.execute(query))[0].vocab_levels_by_course;
        console.log(vocabsLevelsByCourse)
        const defaultCounts = defaultVocabsByLevel();
        courses.forEach(course => course.vocabsByLevel = Object.assign({}, defaultCounts, vocabsLevelsByCourse?.[course.id] ?? {}));
        return courses;
    }

}