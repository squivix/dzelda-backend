import {Collection, Entity, ManyToMany, OneToMany, OneToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {User} from "@/src/models/entities/auth/User.js";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Course} from "@/src/models/entities/Course.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {MapLearnerLesson} from "@/src/models/entities/MapLearnerLesson.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";

@Entity()
export class Profile extends CustomBaseEntity {
    constructor(user: User) {
        super();
        this.user = user;
    }

    @OneToOne({entity: () => User, inversedBy: (user) => user.profile, owner: true, hidden: true})
    user!: User;

    @Property({type: types.string, length: 500, default: ""})
    profilePicture: string = "";

    @Property({type: types.text, length: 255, default: ""})
    bio: string = "";

    @Property({type: types.boolean, default: true})
    isPublic: boolean = true;

    @ManyToMany({
        entity: () => Language,
        mappedBy: (language: Language) => language.learners,
        pivotEntity: () => MapLearnerLanguage,
        hidden: true
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

    [OptionalProps]?: "profilePicture" | "bio" | "isPublic";
}
