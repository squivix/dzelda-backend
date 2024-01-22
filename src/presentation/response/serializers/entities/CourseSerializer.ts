import {Course} from "@/src/models/entities/Course.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {lessonSerializer} from "@/src/presentation/response/serializers/entities/LessonSerializer.js";
import {CourseSchema, LessonSchema} from "dzelda-common";

export class CourseSerializer extends CustomEntitySerializer<Course, CourseSchema> {


    definition(course: Course): CustomCallbackObject<CourseSchema> {
        return {
            id: () => course.id,
            title: () => course.title,
            description: () => course.description,
            image: () => course.image,
            language: () => course.language.code,
            // @ts-ignore
            lessons: () => lessonSerializer.serializeList(course.lessons.getItems(), {ignore: ["course"]}) as Omit<LessonSchema, "course">[],
            addedOn: () => course.addedOn.toISOString(),
            addedBy: () => course.addedBy.user.username,
            vocabsByLevel: () => course.vocabsByLevel,
            isBookmarked: () => course.isBookmarked
        };
    }

    serializeList(entities: Course[], {ignore = [], ...options}: { ignore?: (keyof CourseSchema)[] } = {}): Partial<CourseSchema>[] {
        return super.serializeList(entities, {ignore: [...ignore, "lessons"], ...options});
    }

}

export const courseSerializer = new CourseSerializer();
