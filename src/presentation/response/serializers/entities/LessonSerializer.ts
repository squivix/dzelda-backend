import {Lesson} from "@/src/models/entities/Lesson.js";
import {CollectionSchema, LessonSchema} from "dzelda-common";
import {collectionSerializer} from "@/src/presentation/response/serializers/entities/CollectionSerializer.js";
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
            collection: () => lesson.collection ? collectionSerializer.serialize(lesson.collection, {ignore: ["lessons"]}) as Omit<CollectionSchema, "lessons"> : null,
            orderInCollection: () => lesson.orderInCollection ?? undefined,
            isLastInCollection: () => lesson.isLastInCollection ?? undefined,
            addedOn: () => lesson.addedOn.toISOString(),
            addedBy: () => lesson.addedBy.user.username,
            isPublic: () => lesson.isPublic,
            level: () => lesson.level,
            language: () => lesson.language.code,
            vocabsByLevel: () => lesson.vocabsByLevel,
            pastViewersCount: () => Number(lesson.pastViewersCount)
        };
    }

}

export const lessonSerializer = new LessonSerializer();
