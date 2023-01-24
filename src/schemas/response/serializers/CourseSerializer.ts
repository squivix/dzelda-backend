import {CustomEntitySerializer, SerializationMode} from "@/src/schemas/response/serializers/EntitySerializer.js";
import {Course} from "@/src/models/entities/Course.js";
import {CourseListSchema} from "@/src/schemas/response/interfaces/CourseListSchema.js";
import {CourseDetailsSchema} from "@/src/schemas/response/interfaces/CourseDetailsSchema.js";
import {languageSerializer} from "@/src/schemas/response/serializers/LanguageSerializer.js";
import {profileSerializer} from "@/src/schemas/response/serializers/ProfileSerializer.js";
import {lessonSerializer} from "@/src/schemas/response/serializers/LessonSerializer.js";
import {LessonListSchema} from "@/src/schemas/response/interfaces/LessonListSchema.js";
import {cleanObject} from "@/src/utils/utils.js";


class CourseSerializer extends CustomEntitySerializer<Course, CourseListSchema | CourseDetailsSchema> {
    serialize(course: Course, {
        mode,
        hiddenFields
    }: { mode?: SerializationMode; hiddenFields?: (keyof CourseListSchema | keyof CourseDetailsSchema)[] } = {}): CourseListSchema | CourseDetailsSchema {
        let coursePojo;
        if (mode === SerializationMode.LIST) {
            coursePojo = {
                id: course.id,
                title: course.title,
                description: course.description,
                image: course.image,
                isPublic: course.isPublic,
                level: course.level,
                language: course.language.id,
                addedBy: course.addedBy.user.username,
                vocabsByLevel: course.vocabsByLevel
            };
        } else {
            coursePojo = {
                id: course.id,
                title: course.title,
                description: course.description,
                image: course.image,
                isPublic: course.isPublic,
                level: course.level,
                language: languageSerializer.serialize(course.language),
                addedBy: profileSerializer.serialize(course.addedBy),
                lessons: lessonSerializer.serializeList(course.lessons.getItems()) as LessonListSchema[],
                vocabsByLevel: course.vocabsByLevel
            };
        }
        if (hiddenFields) {
            for (const field of hiddenFields)
                delete coursePojo[field];
        }

        return cleanObject(coursePojo);
    }
}

export const courseSerializer = new CourseSerializer()
