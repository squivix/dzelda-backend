import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {CourseSchema, LearnerVocabSchema, LessonHistoryEntrySchema, MeaningSchema} from "dzelda-common";
import {meaningSerializer} from "@/src/presentation/response/serializers/entities/MeaningSerializer.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {MapPastViewerLesson} from "@/src/models/entities/MapPastViewerLesson.js";
import {courseSerializer} from "@/src/presentation/response/serializers/entities/CourseSerializer.js";

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
            course: () => lessonHistoryEntry.lesson.course ? courseSerializer.serialize(lessonHistoryEntry.lesson.course, {ignore: ["lessons"]}) as Omit<CourseSchema, "lessons"> : null,
            orderInCourse: () => lessonHistoryEntry.lesson.orderInCourse,
            isLastInCourse: () => lessonHistoryEntry.lesson.isLastInCourse,
            addedOn: () => lessonHistoryEntry.lesson.addedOn.toISOString(),
            vocabsByLevel: () => lessonHistoryEntry.lesson.vocabsByLevel,
            pastViewersCount: () => Number(lessonHistoryEntry.lesson.pastViewersCount),
            timeViewed: () => lessonHistoryEntry.timeViewed.toISOString(),
            pastViewer: () => lessonHistoryEntry.pastViewer.user.username
        };
    }

}

export const lessonHistoryEntrySerializer = new LessonHistoryEntrySerializer();
