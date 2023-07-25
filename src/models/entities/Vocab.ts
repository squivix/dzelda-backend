import {Lesson} from "@/src/models/entities/Lesson.js";
import {Collection, Entity, Formula, Index, ManyToMany, ManyToOne, OneToMany, Property, types, Unique} from "@mikro-orm/core";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabRepo} from "@/src/models/repos/VocabRepo.js";

@Entity({customRepository: () => VocabRepo})
@Unique({properties: ["language", "text"]})
@Index({properties: ["language"]})
export class Vocab extends CustomBaseEntity {
    @Property({type: types.string, length: 255})
    text!: string;

    @ManyToOne({entity: () => Language, inversedBy: (language: Language) => language.vocabs})
    language!: Language;

    @Property({type: types.boolean, default: false})
    isPhrase!: boolean;

    @OneToMany({entity: () => Meaning, mappedBy: (meaning: Meaning) => meaning.vocab, orderBy: {learnersCount: "desc", text: "asc"}})
    meanings: Collection<Meaning> = new Collection<Meaning>(this);

    @ManyToMany({
        entity: () => Lesson,
        inversedBy: (lesson: Lesson) => lesson.vocabs,
        pivotEntity: () => MapLessonVocab
    })
    lessonsAppearingIn: Collection<Lesson> = new Collection<Lesson>(this);

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (profile: Profile) => profile.vocabsLearning,
        pivotEntity: () => MapLearnerVocab,
        joinColumn: "vocab_id",
        inverseJoinColumn: "learner_id",
    })
    learners: Collection<Profile> = new Collection<Profile>(this);

    //TODO ignore ignored vocabs
    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_learner_vocab.learner_id) FROM map_learner_vocab WHERE vocab_id = ${alias}.id)`, {
        type: "number"
    })
    learnersCount?: number;


    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_lesson_vocab.lesson_id) FROM map_lesson_vocab WHERE vocab_id = ${alias}.id)`, {
        type: "number"
    })
    lessonsCount?: number;

}
