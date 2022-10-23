import {Entity, ManyToMany, OneToMany, OneToOne, Property, types} from "@mikro-orm/core";
import {User} from "./auth/User.js";
import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Course} from "./Course.js";
import {Meaning} from "./Meaning.js";
import {Lesson} from "./Lesson.js";
import {MapLearnerLesson} from "./MapLearnerLesson.js";
import {Vocab} from "./Vocab.js";
import {MapLearnerVocab} from "./MapLearnerVocab.js";
import {MapLearnerMeaning} from "./MapLearnerMeaning.js";
import {Dictionary} from "./Dictionary.js";
import {MapLearnerDictionary} from "./MapLearnerDictionary.js";

@Entity()
export class Profile extends CustomBaseEntity {
    @OneToOne({entity: () => User, inversedBy: (user) => user.profile, owner: true})
    user!: User;

    @Property({type: types.string, length: 500})
    profilePicture!: string;

    @Property({type: types.text, length: 255, default: ""})
    bio!: string;

    @Property({type: types.boolean, default: true})
    isPublic!: boolean;

    @ManyToMany({
        entity: () => Lesson,
        mappedBy: (lesson: Lesson) => lesson.learners,
        pivotEntity: () => MapLearnerLesson
    })
    lessonsLearning!: Lesson;

    @ManyToMany({
        entity: () => Vocab,
        mappedBy: (vocab: Vocab) => vocab.learners,
        pivotEntity: () => MapLearnerVocab
    })
    vocabsLearning!: Vocab;

    @ManyToMany({
        entity: () => Meaning,
        mappedBy: (meaning: Meaning) => meaning.learners,
        pivotEntity: () => MapLearnerMeaning
    })
    meaningsLearning!: Meaning;

    @ManyToMany({
        entity: () => Dictionary,
        mappedBy: (dictionary: Dictionary) => dictionary.learners,
        pivotEntity: () => MapLearnerDictionary
    })
    dictionariesSaved!: Dictionary;

    @OneToMany({entity: () => Course, mappedBy: (course: Course) => course.addedBy})
    coursesAdded!: Course;

    @OneToMany({entity: () => Meaning, mappedBy: (meaning: Meaning) => meaning.addedBy})
    meaningsAdded!: Meaning;

}