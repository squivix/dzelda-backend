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
import {Language} from "@/src/models/entities/Language.js";

@Entity({customRepository: () => LessonRepo})
@Index({properties: ["course"]})
@Index({properties: ["title"]})
@Index({properties: ["addedOn"]})
export class Lesson extends CustomBaseEntity {
    @Property({type: types.string, length: 124})
    title!: string;

    @Property({type: types.text, length: 50_000})
    text!: string;

    @Property({type: types.string, length: 248, nullable: true})
    parsedTitle!: string;

    @Property({type: types.text, length: 100_000, nullable: true})
    parsedText!: string;

    @Property({type: types.string, length: 500, default: ""})
    audio: string = "";

    @Property({type: types.string, length: 500, default: ""})
    image: string = "";

    @ManyToOne({entity: () => Language, inversedBy: (language) => language.lessons, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    language!: Language;

    @ManyToOne({entity: () => Course, inversedBy: (course) => course.lessons, onDelete: "set null", onUpdateIntegrity: "cascade", nullable: true, default: null})
    course: Course | null = null;

    @Property({type: types.boolean, default: true})
    isPublic: boolean = true;

    @ManyToOne({entity: () => Profile, inversedBy: (profile) => profile.lessonsAdded, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    addedBy!: Profile;

    @Enum({items: () => LanguageLevel, type: types.enum, default: LanguageLevel.ADVANCED_1})
    level: LanguageLevel = LanguageLevel.ADVANCED_1;

    @Property({type: types.integer, nullable: true, default: null})
    orderInCourse: number | null = null;

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

    [OptionalProps]?: "image" | "audio" | "addedOn" | "level" | "orderInCourse" | "pastViewersCount" | "parsedText" | "parsedTitle" | "isLastInCourse";

    //annotated properties
    @Property({persist: false, type: types.json})
    vocabsByLevel?: Record<VocabLevel, number>;

    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_past_viewer_lesson.past_viewer_id) FROM map_past_viewer_lesson WHERE lesson_id = ${alias}.id)`, {
        type: "number"
    })
    pastViewersCount!: number;

    @Formula((alias: string) => `(SELECT ${alias}.order_in_course = MAX(order_in_course) from lesson WHERE course_id = ${alias}.course_id)`, {
        type: "boolean"
    })
    isLastInCourse: boolean | null = null;

    //TODO add field for keeping track of which parser last parsed lesson (to reparse on demand if parser was updated)
}
