import {Collection as MikroORMCollection, Entity, ManyToMany, OneToMany, OneToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {User} from "@/src/models/entities/auth/User.js";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {MapPastViewerLesson} from "@/src/models/entities/MapPastViewerLesson.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {MapBookmarkerCollection} from "@/src/models/entities/MapBookmarkerCollection.js";

@Entity()
export class Profile extends CustomBaseEntity {
    constructor(user: User) {
        super();
        this.user = user;
    }

    @OneToOne({
        entity: () => User,
        inversedBy: (user) => user.profile,
        owner: true,
        hidden: true,
        onDelete: "cascade",
        onUpdateIntegrity: "cascade"
    })
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
    languagesLearning: MikroORMCollection<Language> = new MikroORMCollection<Language>(this);

    @ManyToMany({
        entity: () => Lesson,
        mappedBy: (lesson: Lesson) => lesson.pastViewers,
        pivotEntity: () => MapPastViewerLesson,
        hidden: true
    })
    lessonHistory: MikroORMCollection<Lesson> = new MikroORMCollection<Lesson>(this);

    @ManyToMany({
        entity: () => Vocab,
        mappedBy: (vocab: Vocab) => vocab.learners,
        pivotEntity: () => MapLearnerVocab,
        hidden: true
    })
    vocabsLearning: MikroORMCollection<Vocab> = new MikroORMCollection<Vocab>(this);

    @ManyToMany({
        entity: () => Meaning,
        mappedBy: (meaning: Meaning) => meaning.learners,
        pivotEntity: () => MapLearnerMeaning,
        hidden: true
    })
    meaningsLearning: MikroORMCollection<Meaning> = new MikroORMCollection<Meaning>(this);

    @ManyToMany({
        entity: () => Dictionary,
        mappedBy: (dictionary: Dictionary) => dictionary.learners,
        pivotEntity: () => MapLearnerDictionary,
        hidden: true
    })
    dictionariesSaved: MikroORMCollection<Dictionary> = new MikroORMCollection<Dictionary>(this);

    @ManyToMany({
        entity: () => Collection,
        mappedBy: (collection: Collection) => collection.bookmarkers,
        pivotEntity: () => MapBookmarkerCollection,
        hidden: true
    })
    collectionsBookmarked:MikroORMCollection<Collection> = new MikroORMCollection<Collection>(this);

    @OneToMany({entity: () => Collection, mappedBy: (collection: Collection) => collection.addedBy, hidden: true})
    collectionsAdded: MikroORMCollection<Collection> = new MikroORMCollection<Collection>(this);

    @OneToMany({entity: () => Lesson, mappedBy: (lesson: Lesson) => lesson.addedBy, hidden: true})
    lessonsAdded: MikroORMCollection<Lesson> = new MikroORMCollection<Lesson>(this);

    @OneToMany({entity: () => Meaning, mappedBy: (meaning: Meaning) => meaning.addedBy, hidden: true})
    meaningsAdded: MikroORMCollection<Meaning> = new MikroORMCollection<Meaning>(this);

    [OptionalProps]?: "profilePicture" | "bio" | "isPublic";
}
