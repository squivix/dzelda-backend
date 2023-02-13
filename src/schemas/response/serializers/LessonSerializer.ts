import {Lesson} from "@/src/models/entities/Lesson.js";
import {LessonSchema} from "@/src/schemas/response/interfaces/LessonSchema.js";
import {courseSerializer} from "@/src/schemas/response/serializers/CourseSerializer.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/schemas/response/serializers/CustomEntitySerializer.js";

export class LessonSerializer extends CustomEntitySerializer<Lesson, LessonSchema> {

    definition(lesson: Lesson): CustomCallbackObject<LessonSchema> {
        return {
            id: () => lesson.id,
            title: () => lesson.title,
            text: () => lesson.text,
            audio: () => lesson.audio,
            image: () => lesson.image,
            course: () => courseSerializer.serialize(lesson.course, {ignore: ["lessons"]}),
            orderInCourse: () => lesson.orderInCourse,
            addedOn: () => lesson.addedOn.toISOString(),
            vocabsByLevel: () => lesson.vocabsByLevel
        };
    }

}

export const lessonSerializer = new LessonSerializer();