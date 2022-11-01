import {
    Collection,
    Entity,
    EntityRepositoryType,
    ManyToMany,
    OneToMany,
    OneToOne,
    Property,
    types
} from "@mikro-orm/core";
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
import ProfileRepo from "../repos/auth/ProfileRepo.js";
import {Language} from "./Language.js";
import {MapLearnerLanguage} from "./MapLearnerLanguage.js";

@Entity({customRepository: () => ProfileRepo})
export class Profile extends CustomBaseEntity {
    constructor(user: User) {
        super();
        this.user = user;
    }

    @OneToOne({entity: () => User, inversedBy: (user) => user.profile, owner: true, hidden: true})
    user!: User;

    @Property({type: types.string, length: 500, default: ""})
    profilePicture!: string;

    @Property({type: types.text, length: 255, default: ""})
    bio!: string;

    @Property({type: types.boolean, default: true})
    isPublic!: boolean;

    @ManyToMany({
        entity: () => Language,
        mappedBy: (language: Language) => language.learners,
        pivotEntity: () => MapLearnerLanguage,
        joinColumn: "learner_id",
        inverseJoinColumn: "language_id",
    })
    languagesLearning: Collection<Language> = new Collection<Language>(this);

    @ManyToMany({
        entity: () => Lesson,
        mappedBy: (lesson: Lesson) => lesson.learners,
        pivotEntity: () => MapLearnerLesson,
        hidden: true
    })
    lessonsLearning: Collection<Lesson> = new Collection<Lesson>(this);

    @ManyToMany({
        entity: () => Vocab,
        mappedBy: (vocab: Vocab) => vocab.learners,
        pivotEntity: () => MapLearnerVocab,
        hidden: true
    })
    vocabsLearning: Collection<Vocab> = new Collection<Vocab>(this);

    @ManyToMany({
        entity: () => Meaning,
        mappedBy: (meaning: Meaning) => meaning.learners,
        pivotEntity: () => MapLearnerMeaning,
        hidden: true
    })
    meaningsLearning: Collection<Meaning> = new Collection<Meaning>(this);

    @ManyToMany({
        entity: () => Dictionary,
        mappedBy: (dictionary: Dictionary) => dictionary.learners,
        pivotEntity: () => MapLearnerDictionary,
        hidden: true
    })
    dictionariesSaved: Collection<Dictionary> = new Collection<Dictionary>(this);

    @OneToMany({entity: () => Course, mappedBy: (course: Course) => course.addedBy, hidden: true})
    coursesAdded: Collection<Course> = new Collection<Course>(this);

    @OneToMany({entity: () => Meaning, mappedBy: (meaning: Meaning) => meaning.addedBy, hidden: true})
    meaningsAdded: Collection<Meaning> = new Collection<Meaning>(this);

    [EntityRepositoryType]?: ProfileRepo;
}