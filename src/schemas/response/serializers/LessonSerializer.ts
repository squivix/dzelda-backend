import {CustomEntitySerializer, SerializationMode} from "@/src/schemas/response/serializers/EntitySerializer.js";
import {LessonListSchema} from "@/src/schemas/response/interfaces/LessonListSchema.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {LessonDetailsSchema} from "@/src/schemas/response/interfaces/LessonDetailsSchema.js";
import {CourseListSchema} from "@/src/schemas/response/interfaces/CourseListSchema.js";
import {courseSerializer} from "@/src/schemas/response/serializers/CourseSerializer.js";
import {CourseDetailsSchema} from "@/src/schemas/response/interfaces/CourseDetailsSchema.js";

class LessonSerializer extends CustomEntitySerializer<Lesson, LessonListSchema | LessonDetailsSchema> {
    override serialize(lesson: Lesson, {
        mode,
        hiddenFields
    }: { mode?: SerializationMode; hiddenFields?: (keyof LessonListSchema | LessonDetailsSchema)[] }): LessonListSchema | LessonDetailsSchema {
        if (mode === SerializationMode.LIST) {
            return {
                id: lesson.id,
                title: lesson.title,
                image: lesson.image,
                course: courseSerializer.serialize(lesson.course, {mode: SerializationMode.LIST}) as CourseListSchema,
                orderInCourse: lesson.orderInCourse,
                addedOn: lesson.addedOn.toISOString(),
                vocabsByLevel: lesson.vocabsByLevel
            }
        } else {
            return {
                id: lesson.id,
                title: lesson.title,
                text: lesson.text,
                audio: lesson.audio,
                image: lesson.image,
                course: courseSerializer.serialize(lesson.course, {mode: SerializationMode.DETAIL}) as CourseDetailsSchema,
                orderInCourse: lesson.orderInCourse,
                addedOn: lesson.addedOn.toISOString(),
                vocabsByLevel: lesson.vocabsByLevel
            }
        }
    }
}

export const lessonSerializer = new LessonSerializer()