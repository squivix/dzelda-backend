import {Collection, Entity, Formula, ManyToMany, OneToMany, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Course} from "@/src/models/entities/Course.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {LanguageRepo} from "@/src/models/repos/LanguageRepo.js";
import {Lesson} from "@/src/models/entities/Lesson.js";

@Entity({customRepository: () => LanguageRepo})
export class Language extends CustomBaseEntity {
    @Property({type: types.string, unique: true})
    code!: string;

    @Property({type: types.string, length: 255})
    name!: string;

    @Property({type: types.string, length: 255})
    greeting!: string;

    @Property({type: types.string, length: 500, nullable: true, default: null})
    flag: string | null = null;

    @Property({type: types.string, length: 500, nullable: true, default: null})
    flagCircular: string | null = null;

    @Property({type: types.string, length: 32, nullable: true, default: null})
    flagEmoji?: string | null = null;

    @Property({type: types.string, length: 32})
    color?: string;

    @Property({type: types.boolean, default: false})
    isSupported: boolean = false;

    @Property({
        type: types.json,
        defaultRaw: `'{"beginner1": 0,"beginner2": 1000,"intermediate1": 5000,"intermediate2": 12000,"advanced1": 20000,"advanced2": 30000}'::jsonb`
    })
    levelThresholds!: {
        beginner1: number;
        beginner2: number;
        intermediate1: number;
        intermediate2: number;
        advanced1: number;
        advanced2: number;
    };

    @OneToMany({entity: () => Lesson, mappedBy: (lesson: Lesson) => lesson.language, hidden: true})
    lessons: Collection<Lesson> = new Collection<Lesson>(this);

    @OneToMany({entity: () => Course, mappedBy: (course: Course) => course.language, hidden: true})
    courses: Collection<Course> = new Collection<Course>(this);

    @OneToMany({entity: () => Dictionary, mappedBy: (dictionary) => dictionary.language, hidden: true})
    dictionaries: Collection<Dictionary> = new Collection<Dictionary>(this);

    @OneToMany({entity: () => Vocab, mappedBy: (vocab) => vocab.language, hidden: true})
    vocabs: Collection<Vocab> = new Collection<Vocab>(this);

    @OneToMany({entity: () => Meaning, mappedBy: (meaning) => meaning.language, hidden: true})
    meaningsSavedIn: Collection<Meaning> = new Collection<Meaning>(this);

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (profile: Profile) => profile.languagesLearning,
        pivotEntity: () => MapLearnerLanguage,
        joinColumn: "language_id",
        inverseJoinColumn: "learner_id",
        hidden: true
    })
    learners: Collection<Profile> = new Collection<Profile>(this);


    @Formula((alias: string) => `(SELECT COUNT(learner_id) FROM map_learner_language WHERE language_id=${alias}.id)`, {
        type: types.integer,
        // lazy: true
    })
    learnersCount!: number;


}

