import {Course} from "@/src/models/entities/Course.js";
import {CourseListSchema} from "@/src/schemas/response/interfaces/CourseListSchema.js";
import {CourseDetailsSchema} from "@/src/schemas/response/interfaces/CourseDetailsSchema.js";
import {languageSerializer} from "@/src/schemas/response/serializers/LanguageSerializer.js";
import {profileSerializer} from "@/src/schemas/response/serializers/ProfileSerializer.js";
import {lessonSerializer} from "@/src/schemas/response/serializers/LessonSerializer.js";
import {LessonListSchema} from "@/src/schemas/response/interfaces/LessonListSchema.js";
import {CustomCallbackObject, ListDetailSerializer} from "@/src/schemas/response/serializers/ListDetailSerializer.js";
import {LanguageDetailsSchema} from "@/src/schemas/response/interfaces/LanguageDetailsSchema.js";


class CourseSerializer extends ListDetailSerializer<Course, CourseListSchema, CourseDetailsSchema> {
    listDefinition(course: Course): CustomCallbackObject<CourseListSchema> {
        return {
            id: () => course.id,
            title: () => course.title,
            description: () => course.description,
            image: () => course.image,
            isPublic: () => course.isPublic,
            level: () => course.level,
            language: () => course.language.id,
            addedBy: () => course.addedBy.user.username,
            vocabsByLevel: () => course.vocabsByLevel
        };
    }

    detailDefinition(course: Course): CustomCallbackObject<CourseDetailsSchema> {
        return {
            id: () => course.id,
            title: () => course.title,
            description: () => course.description,
            image: () => course.image,
            isPublic: () => course.isPublic,
            level: () => course.level,
            language: () => (languageSerializer.serialize(course.language) as LanguageDetailsSchema),
            addedBy: () => profileSerializer.serialize(course.addedBy),
            lessons: () => lessonSerializer.serializeList(course.lessons.getItems()) as LessonListSchema[],
            vocabsByLevel: () => course.vocabsByLevel
        };
    }

}

export const courseSerializer = new CourseSerializer()
