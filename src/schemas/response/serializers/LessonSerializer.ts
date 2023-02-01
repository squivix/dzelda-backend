import {LessonListSchema} from "@/src/schemas/response/interfaces/LessonListSchema.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {LessonDetailsSchema} from "@/src/schemas/response/interfaces/LessonDetailsSchema.js";
import {CourseListSchema} from "@/src/schemas/response/interfaces/CourseListSchema.js";
import {courseSerializer} from "@/src/schemas/response/serializers/CourseSerializer.js";
import {CourseDetailsSchema} from "@/src/schemas/response/interfaces/CourseDetailsSchema.js";
import {
    CustomCallbackObject,
    ListDetailSerializer,
    SerializationMode
} from "@/src/schemas/response/serializers/ListDetailSerializer.js";

class LessonSerializer extends ListDetailSerializer<Lesson, LessonListSchema, LessonDetailsSchema> {
    listDefinition(lesson: Lesson): CustomCallbackObject<LessonListSchema> {
        return {
            id: () => lesson.id,
            title: () => lesson.title,
            image: () => lesson.image,
            course: () => courseSerializer.serialize(lesson.course, {mode: SerializationMode.LIST}) as CourseListSchema,
            orderInCourse: () => lesson.orderInCourse,
            addedOn: () => lesson.addedOn.toISOString(),
            vocabsByLevel: () => lesson.vocabsByLevel
        };
    }

    detailDefinition(lesson: Lesson): CustomCallbackObject<LessonDetailsSchema> {
        return {
            id: () => lesson.id,
            title: () => lesson.title,
            text: () => lesson.text,
            audio: () => lesson.audio,
            image: () => lesson.image,
            course: () => courseSerializer.serialize(lesson.course, {mode: SerializationMode.DETAIL}) as CourseDetailsSchema,
            orderInCourse: () => lesson.orderInCourse,
            addedOn: () => lesson.addedOn.toISOString(),
            vocabsByLevel: () => lesson.vocabsByLevel
        };
    }

}

export const lessonSerializer = new LessonSerializer()