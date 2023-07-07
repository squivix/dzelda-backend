import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Collection, Entity, Enum, Formula, Index, ManyToMany, ManyToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {Course} from "@/src/models/entities/Course.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapLearnerLesson} from "@/src/models/entities/MapLearnerLesson.js";
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
    audio!: string;

    @Property({type: types.string, length: 500, default: ""})
    image!: string;

    @ManyToOne({entity: () => Course, inversedBy: (course) => course.lessons})
    course!: Course;

    @Property({type: types.integer, default: 0})
    orderInCourse!: number;

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
        inversedBy: (profile: Profile) => profile.lessonsLearning,
        pivotEntity: () => MapLearnerLesson,
        joinColumn: "lesson_id",
        inverseJoinColumn: "learner_id",
    })
    learners: Collection<Profile> = new Collection<Profile>(this);

    [OptionalProps]?: "image" | "audio" | "level" | "addedOn";

    //annotated properties
    @Property({persist: false, type: types.json})
    vocabsByLevel?: Record<VocabLevel, number>;

    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_learner_lesson.learner_id) FROM map_learner_lesson JOIN lesson ON map_learner_lesson.lesson_id = lesson.id WHERE lesson.id = ${alias}.id)`, {
        type: "number"
    })
    learnersCount?: number;
}
