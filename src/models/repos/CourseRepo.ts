import {EntityRepository} from "@mikro-orm/postgresql";
import {defaultVocabsByLevel} from "@/src/models/enums/VocabLevel.js";
import {Course} from "@/src/models/entities/Course.js";
import {User} from "@/src/models/entities/auth/User.js";
import {Loaded} from "@mikro-orm/core";

export class CourseRepo extends EntityRepository<Course> {

    async annotateCoursesWithUserData(courses: Course[], user: User) {
        await this.annotateVocabsByLevel(courses, user.profile.id);
        await this.annotateIsBookmarked(courses, user.profile.id);
    }

    private async annotateVocabsByLevel(courses: Course[], learnerId: number) {
        if (courses.length === 0)
            return courses;
        const query = `SELECT json_object_agg(outq.id, outq.vocab_levels) AS vocab_levels_by_course
FROM (SELECT subq.course_id                          AS id,
             json_object_agg(COALESCE(subq.level, 0), subq.count) AS vocab_levels
      FROM (SELECT lesson.course_id,
                   mlv2.level,
                   COUNT(*)
            FROM map_lesson_vocab mlv
                     LEFT JOIN map_learner_vocab mlv2 on mlv.vocab_id = mlv2.vocab_id AND mlv2.learner_id = ${learnerId}
                     LEFT JOIN lesson on mlv.lesson_id = lesson.id
            WHERE lesson.course_id IN (${courses.map(c=>c.id).join(",")})
            GROUP BY lesson.course_id, mlv2.level
            ORDER BY lesson.course_id) AS subq
      GROUP BY subq.course_id) as outq`;

        const vocabsLevelsByCourse = (await this.em.execute(query))[0].vocab_levels_by_course;
        const defaultCounts = defaultVocabsByLevel();
        courses.forEach(course => course.vocabsByLevel = Object.assign({}, defaultCounts, vocabsLevelsByCourse?.[course.id] ?? {}));
        return courses;
    }

    private async annotateIsBookmarked(courses: Course[], learnerId: number) {
        if (courses.length === 0)
            return courses;
        const query = `SELECT json_object_agg(course_id, true) AS course_id_to_is_bookmarked FROM map_bookmarker_course WHERE bookmarker_id = ${learnerId};`;
        const courseIdToIsBookmarked = (await this.em.execute(query))[0].course_id_to_is_bookmarked;
        courses.forEach(course => course.isBookmarked = courseIdToIsBookmarked?.[course.id] ?? false);
        return courses;
    }

}
