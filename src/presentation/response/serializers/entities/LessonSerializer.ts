import {Lesson} from "@/src/models/entities/Lesson.js";
import {CourseSchema, LessonSchema} from "dzelda-common";
import {courseSerializer} from "@/src/presentation/response/serializers/entities/CourseSerializer.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";

export class LessonSerializer extends CustomEntitySerializer<Lesson, LessonSchema> {

    definition(lesson: Lesson): CustomCallbackObject<LessonSchema> {
        return {
            id: () => lesson.id,
            title: () => lesson.title,
            text: () => lesson.text,
            parsedTitle: () => lesson.parsedTitle,
            parsedText: () => lesson.parsedText,
            audio: () => lesson.audio,
            image: () => lesson.image,
            //@ts-ignore
            course: () => lesson.course ? courseSerializer.serialize(lesson.course, {ignore: ["lessons"]}) as Omit<CourseSchema, "lessons"> : null,
            orderInCourse: () => lesson.orderInCourse ?? undefined,
            isLastInCourse: () => lesson.isLastInCourse ?? undefined,
            addedOn: () => lesson.addedOn.toISOString(),
            isPublic: () => lesson.isPublic,
            level: () => lesson.level,
            language: () => lesson.language.code,
            vocabsByLevel: () => lesson.vocabsByLevel,
            pastViewersCount: () => Number(lesson.pastViewersCount)
        };
    }

}

export const lessonSerializer = new LessonSerializer();
