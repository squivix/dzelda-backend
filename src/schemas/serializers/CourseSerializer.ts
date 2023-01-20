import {CustomEntitySerializer, SerializationMode} from "@/src/schemas/serializers/EntitySerializer.js";
import {Course} from "@/src/models/entities/Course.js";
import {CourseListSchema} from "@/src/schemas/interfaces/CourseListSchema.js";
import {CourseDetailsSchema} from "@/src/schemas/interfaces/CourseDetailsSchema.js";
import {languageSerializer} from "@/src/schemas/serializers/LanguageSerializer.js";
import {profileSerializer} from "@/src/schemas/serializers/ProfileSerializer.js";
import {lessonSerializer} from "@/src/schemas/serializers/LessonSerializer.js";
import {VocabsByLevelCount} from "@/src/schemas/interfaces/VocabsByLevelCount.js";


class CourseSerializer extends CustomEntitySerializer<Course, CourseListSchema | CourseDetailsSchema> {
    serialize(course: Course, {
        mode,
        hiddenFields
    }: { mode?: SerializationMode; hiddenFields?: (keyof CourseListSchema | CourseDetailsSchema)[] } = {}): CourseListSchema | CourseDetailsSchema {
        const lessons = lessonSerializer.serializeList(course.lessons.getItems());
        const vocabsByLevel = lessons.reduce((a, l) => {
            (Object.keys(a) as Array<keyof VocabsByLevelCount>).forEach((k) => a[k] += l.vocabsByLevel[k])
            return a;
        }, {
            ignored: 0,
            new: 0,
            level1: 0,
            level2: 0,
            level3: 0,
            level4: 0,
            learned: 0,
            known: 0,
        })
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
                vocabsByLevel
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
                lessons: lessons,
                vocabsByLevel
            };
        }
    }
}

export const courseSerializer = new CourseSerializer()
