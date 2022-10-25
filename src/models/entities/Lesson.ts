import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Collection, Entity, ManyToMany, ManyToOne, Property, types} from "@mikro-orm/core";
import {Course} from "./Course.js";
import {Vocab} from "./Vocab.js";
import {MapLessonVocab} from "./MapLessonVocab.js";
import {Profile} from "./Profile.js";
import {MapLearnerLesson} from "./MapLearnerLesson.js";

@Entity()
export class Lesson extends CustomBaseEntity {
    @Property({type: types.string, length: 124})
    title!: string;

    @Property({type: types.text, length: 50_000})
    text!: string;

    @Property({type: types.string, length: 500, nullable: true, default: null})
    audio!: string;

    @Property({type: types.string, length: 500, nullable: true, default: null})
    image!: string;

    @ManyToOne({entity: () => Course, inversedBy: (course) => course.lessons})
    course!: Course;

    @Property({type: types.integer, default: 0})
    orderInCourse!: number;

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
        pivotEntity: () => MapLearnerLesson
    })
    learners: Collection<Profile> = new Collection<Profile>(this);
}