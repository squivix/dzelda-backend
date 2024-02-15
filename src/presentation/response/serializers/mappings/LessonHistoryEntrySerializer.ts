import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {CollectionSchema, LessonHistoryEntrySchema} from "dzelda-common";
import {MapPastViewerLesson} from "@/src/models/entities/MapPastViewerLesson.js";
import {collectionSerializer} from "@/src/presentation/response/serializers/entities/CollectionSerializer.js";

export class LessonHistoryEntrySerializer extends CustomEntitySerializer<MapPastViewerLesson, LessonHistoryEntrySchema> {
    definition(lessonHistoryEntry: MapPastViewerLesson): CustomCallbackObject<Partial<LessonHistoryEntrySchema>> {
        //if only vocab is sent
        return {
            id: () => lessonHistoryEntry.lesson.id,
            title: () => lessonHistoryEntry.lesson.title,
            text: () => lessonHistoryEntry.lesson.text,
            parsedTitle: () => lessonHistoryEntry.lesson.parsedTitle,
            parsedText: () => lessonHistoryEntry.lesson.parsedText,
            audio: () => lessonHistoryEntry.lesson.audio,
            image: () => lessonHistoryEntry.lesson.image,
            //@ts-ignore
            collection: () => lessonHistoryEntry.lesson.collection ? collectionSerializer.serialize(lessonHistoryEntry.lesson.collection, {ignore: ["lessons"]}) as Omit<CollectionSchema, "lessons"> : null,
            orderInCollection: () => lessonHistoryEntry.lesson.orderInCollection ?? undefined,
            isLastInCollection: () => lessonHistoryEntry.lesson.isLastInCollection ?? undefined,
            addedOn: () => lessonHistoryEntry.lesson.addedOn.toISOString(),
            vocabsByLevel: () => lessonHistoryEntry.lesson.vocabsByLevel,
            pastViewersCount: () => Number(lessonHistoryEntry.lesson.pastViewersCount),
            timeViewed: () => lessonHistoryEntry.timeViewed.toISOString(),
            pastViewer: () => lessonHistoryEntry.pastViewer.user.username
        };
    }

}

export const lessonHistoryEntrySerializer = new LessonHistoryEntrySerializer();
