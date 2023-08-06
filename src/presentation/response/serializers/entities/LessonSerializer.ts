import {Lesson} from "@/src/models/entities/Lesson.js";
import {CourseSchema, LessonSchema} from "dzelda-types";
import {courseSerializer} from "@/src/presentation/response/serializers/entities/CourseSerializer.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";

export class LessonSerializer extends CustomEntitySerializer<Lesson, LessonSchema> {

    definition(lesson: Lesson): CustomCallbackObject<LessonSchema> {
        return {
            id: () => lesson.id,
            title: () => lesson.title,
            text: () => lesson.text,
            audio: () => lesson.audio,
            image: () => lesson.image,
            course: () => courseSerializer.serialize(lesson.course, {ignore: ["lessons"]}) as Omit<CourseSchema, "lessons">,
            level: () => lesson.level as `${typeof lesson.level}`,
            orderInCourse: () => lesson.orderInCourse,
            addedOn: () => lesson.addedOn.toISOString(),
            vocabsByLevel: () => lesson.vocabsByLevel,
            learnersCount: () => Number(lesson.learnersCount)
        };
    }

}

export const lessonSerializer = new LessonSerializer();
