import {Course} from "@/src/models/entities/Course.js";
import {CourseSchema} from "@/src/schemas/response/interfaces/CourseSchema.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/schemas/response/serializers/CustomEntitySerializer.js";
import {lessonSerializer} from "@/src/schemas/response/serializers/LessonSerializer.js";


export class CourseSerializer extends CustomEntitySerializer<Course, CourseSchema> {


    definition(course: Course): CustomCallbackObject<CourseSchema> {
        return {
            id: () => course.id,
            title: () => course.title,
            description: () => course.description,
            image: () => course.image,
            isPublic: () => course.isPublic,
            level: () => course.level,
            language: () => course.language.code,
            lessons: () => lessonSerializer.serializeList(course.lessons.getItems(), {ignore: ["course"]}),
            addedBy: () => course.addedBy.user.username,
            vocabsByLevel: () => course.vocabsByLevel
        };
    }

    serializeList(entities: Course[], {ignore = [], ...options}: { ignore?: (keyof CourseSchema)[] } = {}): Partial<CourseSchema>[] {
        return super.serializeList(entities, {ignore: [...ignore, "lessons"], ...options});
    }

}

export const courseSerializer = new CourseSerializer();
