import {Collection as MikroOrmCollection, Entity, Formula, Index, ManyToMany, ManyToOne, OneToMany, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {CollectionRepo} from "@/src/models/repos/CollectionRepo.js";
import {MapBookmarkerCollection} from "@/src/models/entities/MapBookmarkerCollection.js";

@Entity({customRepository: () => CollectionRepo})
@Index({properties: ["language"]})
@Index({properties: ["addedBy"]})
@Index({properties: ["title"]})
@Index({properties: ["addedOn"]})
export class Collection extends CustomBaseEntity {

    @Property({type: types.string, length: 255})
    title!: string;

    @Property({type: types.string, length: 500, default: ""})
    description: string = "";

    @ManyToOne({entity: () => Language, inversedBy: (language) => language.collections, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    language!: Language;

    @Property({type: types.string, length: 500, default: ""})
    image: string = "";

    @ManyToOne({entity: () => Profile, inversedBy: (profile) => profile.collectionsAdded, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    addedBy!: Profile;

    @Property({type: types.datetime, defaultRaw: "now()"})
    addedOn!: Date;

    @OneToMany({entity: () => Lesson, mappedBy: (lesson) => lesson.collection})
    lessons: MikroOrmCollection<Lesson> = new MikroOrmCollection<Lesson>(this);

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (bookmarker: Profile) => bookmarker.collectionsBookmarked,
        pivotEntity: () => MapBookmarkerCollection,
        joinColumn: "collection_id",
        inverseJoinColumn: "bookmarker_id"
    })
    bookmarkers!: Profile;

    [OptionalProps]?: "description" | "image" | "isPublic" | "addedOn" | "level" | "bookmarkers" | "avgPastViewersCountPerLesson";


    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_past_viewer_lesson.past_viewer_id)::float / GREATEST(COUNT(DISTINCT lesson.id), 1) FROM collection LEFT JOIN lesson on collection.id = lesson.collection_id LEFT JOIN map_past_viewer_lesson on map_past_viewer_lesson.lesson_id = lesson.id WHERE collection.id = ${alias}.id)`, {
        type: "number"
    })
    avgPastViewersCountPerLesson?: number;

    //annotated properties
    @Property({persist: false, type: types.json})
    vocabsByLevel?: Record<VocabLevel, number>;

    @Property({persist: false, type: types.boolean})
    isBookmarked?: boolean;
}
