import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Collection as MikroORMCollection, Entity, Enum, Formula, Index, ManyToMany, ManyToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {Collection} from "@/src/models/entities/Collection.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapPastViewerLesson} from "@/src/models/entities/MapPastViewerLesson.js";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {Language} from "@/src/models/entities/Language.js";

@Entity({customRepository: () => LessonRepo})
@Index({properties: ["collection"]})
@Index({properties: ["title"]})
@Index({properties: ["addedOn"]})
export class Lesson extends CustomBaseEntity {
    @Property({type: types.string, length: 124})
    title!: string;

    @Property({type: types.text, length: 50_000})
    text!: string;

    @Property({type: types.string, length: 248, nullable: true})
    parsedTitle!: string;

    @Property({type: types.text, length: 100_000, nullable: true})
    parsedText!: string;

    @Property({type: types.string, length: 500, default: ""})
    audio: string = "";

    @Property({type: types.string, length: 500, default: ""})
    image: string = "";

    @ManyToOne({entity: () => Language, inversedBy: (language) => language.lessons, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    language!: Language;

    @ManyToOne({entity: () => Collection, inversedBy: (collection) => collection.lessons, onDelete: "set null", onUpdateIntegrity: "cascade", nullable: true, default: null})
    collection: Collection | null = null;

    @Property({type: types.boolean, default: true})
    isPublic: boolean = true;

    @ManyToOne({entity: () => Profile, inversedBy: (profile) => profile.lessonsAdded, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    addedBy!: Profile;

    @Enum({items: () => LanguageLevel, type: types.enum, default: LanguageLevel.ADVANCED_1})
    level: LanguageLevel = LanguageLevel.ADVANCED_1;

    @Property({type: types.integer, nullable: true, default: null})
    orderInCollection: number | null = null;

    @Property({type: types.datetime, defaultRaw: "now()"})
    addedOn!: Date;

    @ManyToMany({
        entity: () => Vocab,
        mappedBy: (vocab) => vocab.lessonsAppearingIn,
        pivotEntity: () => MapLessonVocab
    })
    vocabs: MikroORMCollection<Vocab> = new MikroORMCollection<Vocab>(this);

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (profile: Profile) => profile.lessonHistory,
        pivotEntity: () => MapPastViewerLesson,
        joinColumn: "lesson_id",
        inverseJoinColumn: "past_viewer_id",
    })
    pastViewers: MikroORMCollection<Profile> = new MikroORMCollection<Profile>(this);

    [OptionalProps]?: "image" | "audio" | "addedOn" | "level" | "orderInCollection" | "pastViewersCount" | "parsedText" | "parsedTitle" | "isLastInCollection";

    //annotated properties
    @Property({persist: false, type: types.json})
    vocabsByLevel?: Record<VocabLevel, number>;

    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_past_viewer_lesson.past_viewer_id) FROM map_past_viewer_lesson WHERE lesson_id = ${alias}.id)`, {
        type: "number"
    })
    pastViewersCount!: number;

    @Formula((alias: string) => `(SELECT ${alias}.order_in_collection = MAX(order_in_collection) from lesson WHERE collection_id = ${alias}.collection_id)`, {
        type: "boolean"
    })
    isLastInCollection: boolean | null = null;

    //TODO add field for keeping track of which parser last parsed lesson (to reparse on demand if parser was updated)
}
