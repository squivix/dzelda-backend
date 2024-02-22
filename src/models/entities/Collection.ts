import {Collection as MikroOrmCollection, Entity, Formula, Index, ManyToMany, ManyToOne, OneToMany, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Text} from "@/src/models/entities/Text.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {CollectionRepo} from "@/src/models/repos/CollectionRepo.js";
import {CollectionBookmark} from "@/src/models/entities/CollectionBookmark.js";

@Entity({repository: () => CollectionRepo})
@Index({properties: ["language"]})
@Index({properties: ["addedBy"]})
@Index({properties: ["title"]})
@Index({properties: ["addedOn"]})
export class Collection extends CustomBaseEntity {

    @Property({type: types.string, length: 255})
    title!: string;

    @Property({type: types.string, length: 500, default: ""})
    description: string = "";

    @ManyToOne({entity: () => Language, inversedBy: (language) => language.collections, deleteRule: "cascade", updateRule: "cascade"})
    language!: Language;

    @Property({type: types.string, length: 500, default: ""})
    image: string = "";

    @ManyToOne({entity: () => Profile, inversedBy: (profile) => profile.collectionsAdded, deleteRule: "cascade", updateRule: "cascade"})
    addedBy!: Profile;

    @Property({type: types.datetime, defaultRaw: "now()"})
    addedOn!: Date;

    @OneToMany({entity: () => Text, mappedBy: (text) => text.collection})
    texts: MikroOrmCollection<Text> = new MikroOrmCollection<Text>(this);

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (bookmarker: Profile) => bookmarker.collectionsBookmarked,
        pivotEntity: () => CollectionBookmark,
        joinColumn: "collection_id",
        inverseJoinColumn: "bookmarker_id"
    })
    bookmarkers!: Profile;

    [OptionalProps]?: "description" | "image" | "isPublic" | "addedOn" | "level" | "bookmarkers" | "avgPastViewersCountPerText";


    @Formula((alias: string) => `(SELECT COUNT(DISTINCT text_history_entry.past_viewer_id)::float / GREATEST(COUNT(DISTINCT text.id), 1) FROM collection LEFT JOIN text on collection.id = text.collection_id LEFT JOIN text_history_entry on text_history_entry.text_id = text.id WHERE collection.id = ${alias}.id)`, {
        type: "number"
    })
    avgPastViewersCountPerText?: number;

    //annotated properties
    @Property({persist: false, type: types.json})
    vocabsByLevel?: Record<VocabLevel, number>;

    @Property({persist: false, type: types.boolean})
    isBookmarked?: boolean;
}
