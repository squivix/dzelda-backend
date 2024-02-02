import {Lesson} from "@/src/models/entities/Lesson.js";
import {Collection, Entity, Formula, Index, ManyToMany, ManyToOne, OneToMany, OptionalProps, Property, types, Unique} from "@mikro-orm/core";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabRepo} from "@/src/models/repos/VocabRepo.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";

@Entity({customRepository: () => VocabRepo})
@Unique({properties: ["language", "text"]})
@Index({properties: ["language"]})
export class Vocab extends CustomBaseEntity {
    @Property({type: types.string, length: 255})
    text!: string;

    @ManyToOne({
        entity: () => Language,
        inversedBy: (language: Language) => language.vocabs,
        onDelete: "cascade",
        onUpdateIntegrity: "cascade"
    })
    language!: Language;

    @Property({type: types.boolean, default: false})
    isPhrase: boolean = false;

    @OneToMany({entity: () => Meaning, mappedBy: (meaning: Meaning) => meaning.vocab, orderBy: {learnersCount: "desc", text: "asc"}})
    meanings: Collection<Meaning> = new Collection<Meaning>(this);

    @OneToMany({
        entity: () => Meaning, mappedBy: (meaning: Meaning) => meaning.vocab,
        orderBy: {learnersCount: "desc", text: "asc"},
        lazy: true,
    })
    learnerMeanings: Collection<Meaning> = new Collection<Meaning>(this);

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

    @OneToMany({entity: () => TTSPronunciation, mappedBy: (ttsPronunciation: TTSPronunciation) => ttsPronunciation.vocab})
    ttsPronunciations: Collection<TTSPronunciation> = new Collection<TTSPronunciation>(this);

    [OptionalProps]?: "isPhrase";

    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_learner_vocab.learner_id) FROM map_learner_vocab WHERE "vocab_id" = ${alias}.id AND "level" != ${VocabLevel.IGNORED})`, {
        type: "number"
    })
    learnersCount?: number;


    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_lesson_vocab.lesson_id) FROM map_lesson_vocab WHERE vocab_id = ${alias}.id)`, {
        type: "number"
    })
    lessonsCount?: number;

}
