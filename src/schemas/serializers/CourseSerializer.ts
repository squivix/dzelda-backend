import {CustomEntitySerializer, SerializationMode} from "@/src/schemas/serializers/EntitySerializer.js";
import {Course} from "@/src/models/entities/Course.js";
import {CourseListSchema} from "@/src/schemas/interfaces/CourseListSchema.js";
import {CourseDetailsSchema} from "@/src/schemas/interfaces/CourseDetailsSchema.js";
import {languageSerializer} from "@/src/schemas/serializers/LanguageSerializer.js";
import {profileSerializer} from "@/src/schemas/serializers/ProfileSerializer.js";
import {lessonSerializer} from "@/src/schemas/serializers/LessonSerializer.js";


class CourseSerializer extends CustomEntitySerializer<Course, CourseListSchema | CourseDetailsSchema> {
    serialize(course: Course, {
        mode,
        hiddenFields
    }: { mode?: SerializationMode; hiddenFields?: (keyof CourseListSchema | CourseDetailsSchema)[] } = {}): CourseListSchema | CourseDetailsSchema {
        if (mode === SerializationMode.LIST) {
            return {
                id: course.id,
                title: course.title,
                description: course.description,
                image: course.image,
                isPublic: course.isPublic,
                level: course.level,
                language: course.language.id,
                addedBy: course.addedBy.user.username,
                vocabsByLevel: course.vocabsByLevel!
            };
        } else {
            return {
                id: course.id,
                title: course.title,
                description: course.description,
                image: course.image,
                isPublic: course.isPublic,
                level: course.level,
                language: languageSerializer.serialize(course.language),
                addedBy: profileSerializer.serialize(course.addedBy),
                lessons: lessonSerializer.serializeList(course.lessons.getItems()),
                vocabsByLevel: course.vocabsByLevel!
            };
        }
    }
}

export const courseSerializer = new CourseSerializer()
