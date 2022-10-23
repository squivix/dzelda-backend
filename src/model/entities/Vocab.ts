import {Lesson} from "./Lesson.js";
import {Entity, ManyToMany, ManyToOne, OneToMany, Property, types, Unique} from "@mikro-orm/core";
import {MapLessonVocab} from "./MapLessonVocab.js";
import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Language} from "./Language.js";
import {Meaning} from "./Meaning.js";
import {Profile} from "./Profile.js";
import {MapLearnerVocab} from "./MapLearnerVocab.js";

@Entity()
@Unique({properties: ["language", "text"]})
export class Vocab extends CustomBaseEntity {
    @Property({type: types.string, length: 255})
    text!: string;

    @ManyToOne({entity: () => Language, inversedBy: (language: Language) => language.vocabs})
    language!: Language;

    @Property({type: types.boolean, default: false})
    isPhrase!: boolean;

    @OneToMany({entity: () => Meaning, mappedBy: (meaning: Meaning) => meaning.vocab})
    meanings!: Meaning;

    @ManyToMany({
        entity: () => Lesson,
        inversedBy: (lesson: Lesson) => lesson.vocabs,
        pivotEntity: () => MapLessonVocab
    })
    lessonsAppearingIn!: Lesson;

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (profile: Profile) => profile.vocabsLearning,
        pivotEntity: () => MapLearnerVocab
    })
    learners!: Profile;


}