import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Collection, Entity, Enum, Formula, Index, ManyToMany, ManyToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {Course} from "@/src/models/entities/Course.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapPastViewerLesson} from "@/src/models/entities/MapPastViewerLesson.js";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

@Entity({customRepository: () => LessonRepo})
@Index({properties: ["course"]})
@Index({properties: ["title"]})
@Index({properties: ["addedOn"]})
export class Lesson extends CustomBaseEntity {
    @Property({type: types.string, length: 124})
    title!: string;

    @Property({type: types.text, length: 50_000})
    text!: string;

    @Property({type: types.string, length: 500, default: ""})
    audio: string = "";

    @Property({type: types.string, length: 500, default: ""})
    image: string = "";

    @ManyToOne({entity: () => Course, inversedBy: (course) => course.lessons, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    course!: Course;

    @Property({type: types.integer, default: 0})
    orderInCourse: number = 0;

    @Enum({items: () => LanguageLevel, type: types.enum, default: LanguageLevel.ADVANCED_1})
    level: LanguageLevel = LanguageLevel.ADVANCED_1;

    @Property({type: types.datetime, defaultRaw: "now()"})
    addedOn!: Date;

    @ManyToMany({
        entity: () => Vocab,
        mappedBy: (vocab) => vocab.lessonsAppearingIn,
        pivotEntity: () => MapLessonVocab
    })
    vocabs: Collection<Vocab> = new Collection<Vocab>(this);

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (profile: Profile) => profile.lessonHistory,
        pivotEntity: () => MapPastViewerLesson,
        joinColumn: "lesson_id",
        inverseJoinColumn: "past_viewer_id",
    })
    pastViewers: Collection<Profile> = new Collection<Profile>(this);

    [OptionalProps]?: "image" | "audio" | "level" | "addedOn" | "pastViewersCount";

    //annotated properties
    @Property({persist: false, type: types.json})
    vocabsByLevel?: Record<VocabLevel, number>;

    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_past_viewer_lesson.past_viewer_id) FROM map_past_viewer_lesson WHERE lesson_id = ${alias}.id)`, {
        type: "number"
    })
    pastViewersCount!: number;
    //TODO add field for keeping track of which parser last parsed lesson (to reparse on demand if parser was updated)
}
