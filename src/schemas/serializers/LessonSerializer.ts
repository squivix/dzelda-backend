import {CustomEntitySerializer, SerializationMode} from "@/src/schemas/serializers/EntitySerializer.js";
import {LessonListSchema} from "@/src/schemas/interfaces/LessonListSchema.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {LessonDetailsSchema} from "@/src/schemas/interfaces/LessonDetailsSchema.js";

class LessonSerializer extends CustomEntitySerializer<Lesson, LessonListSchema | LessonDetailsSchema> {
    override serialize(lesson: Lesson, {
        mode,
        hiddenFields
    }: { mode?: SerializationMode; hiddenFields?: (keyof LessonListSchema | LessonDetailsSchema)[] }): LessonListSchema | LessonDetailsSchema {
        return {
            vocabsByLevel: lesson.vocabsByLevel!
        };
    }
}

export const lessonSerializer = new LessonSerializer()