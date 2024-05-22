import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Collection as MikroORMCollection, Entity, Enum, Formula, Index, ManyToMany, ManyToOne, OneToMany, OptionalProps, Property, types} from "@mikro-orm/core";
import {Collection} from "@/src/models/entities/Collection.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapTextVocab} from "@/src/models/entities/MapTextVocab.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {TextHistoryEntry} from "@/src/models/entities/TextHistoryEntry.js";
import {TextRepo} from "@/src/models/repos/TextRepo.js";
import {LanguageLevel, VocabLevel} from "dzelda-common";
import {Language} from "@/src/models/entities/Language.js";
import {TextBookmark} from "@/src/models/entities/TextBookmark.js";
import {MapHiderText} from "@/src/models/entities/MapHiderText.js";
import {FlaggedTextReport} from "@/src/models/entities/FlaggedTextReport.js";

@Entity({repository: () => TextRepo})
@Index({properties: ["collection"]})
@Index({properties: ["title"]})
@Index({properties: ["addedOn"]})
@Index({properties: ["language"]})
@Index({properties: ["addedBy"]})
export class Text extends CustomBaseEntity {
    @Property({type: types.string, length: 124})
    title!: string;

    @Property({type: types.text, length: 50_000})
    content!: string;

    @Property({type: types.string, length: 248, nullable: true})
    parsedTitle!: string | null;

    @Property({type: types.text, length: 100_000, nullable: true})
    parsedContent!: string | null;

    @Property({type: types.string, length: 500, default: ""})
    audio: string = "";

    @Property({type: types.string, length: 500, default: ""})
    image: string = "";

    @Property({type: types.boolean, default: false})
    isProcessing: boolean = false;

    @ManyToOne({entity: () => Language, inversedBy: (language) => language.texts, deleteRule: "cascade", updateRule: "cascade"})
    language!: Language;

    @ManyToOne({entity: () => Collection, inversedBy: (collection) => collection.texts, deleteRule: "set null", updateRule: "cascade", nullable: true, default: null})
    collection: Collection | null = null;

    @Property({type: types.boolean, default: true})
    isPublic: boolean = true;

    @ManyToOne({entity: () => Profile, inversedBy: (profile) => profile.textsAdded, deleteRule: "cascade", updateRule: "cascade"})
    addedBy!: Profile;

    @Enum({items: () => LanguageLevel, type: types.enum, default: LanguageLevel.ADVANCED_1})
    level: LanguageLevel = LanguageLevel.ADVANCED_1;

    @Property({type: types.integer, nullable: true, default: null})
    orderInCollection: number | null = null;

    @Property({type: types.datetime, defaultRaw: "now()"})
    addedOn!: Date;

    @Property({type: types.boolean, default: false})
    isHidden!: boolean;

    @ManyToMany({
        entity: () => Vocab,
        mappedBy: (vocab) => vocab.textsAppearingIn,
        pivotEntity: () => MapTextVocab
    })
    vocabs: MikroORMCollection<Vocab> = new MikroORMCollection<Vocab>(this);

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (profile: Profile) => profile.textHistory,
        pivotEntity: () => TextHistoryEntry,
        joinColumn: "text_id",
        inverseJoinColumn: "past_viewer_id",
    })
    pastViewers: MikroORMCollection<Profile> = new MikroORMCollection<Profile>(this);

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (bookmarker: Profile) => bookmarker.textsBookmarked,
        pivotEntity: () => TextBookmark,
        joinColumn: "text_id",
        inverseJoinColumn: "bookmarker_id"
    })
    bookmarkers!: Profile;

    [OptionalProps]?: "image" | "audio" | "addedOn" | "level" | "orderInCollection" | "pastViewersCount" | "parsedContent" | "parsedTitle" | "isLastInCollection" | "bookmarkers" | "isHidden";

    //annotated properties
    @Property({persist: false, type: types.json})
    vocabsByLevel?: Record<VocabLevel, number>;

    @Formula((alias: string) => `(SELECT COUNT(DISTINCT text_history_entry.past_viewer_id) FROM text_history_entry WHERE text_id = ${alias}.id)`, {
        type: "number"
    })
    pastViewersCount!: number;

    @Formula((alias: string) => `(SELECT ${alias}.order_in_collection = MAX(order_in_collection) from text WHERE collection_id = ${alias}.collection_id)`, {
        type: "boolean"
    })
    isLastInCollection: boolean | null = null;

    @Property({persist: false, type: types.boolean})
    isBookmarked?: boolean;

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (hider: Profile) => hider.textsHidden,
        pivotEntity: () => MapHiderText,
        hidden: true
    })
    hiddenBy: MikroORMCollection<Profile> = new MikroORMCollection<Profile>(this);

    @OneToMany({
        entity: () => FlaggedTextReport,
        mappedBy: (report: FlaggedTextReport) => report.text,
        hidden: true
    })
    flaggedReports: MikroORMCollection<FlaggedTextReport> = new MikroORMCollection<FlaggedTextReport>(this);

    //TODO add field for keeping track of which parser last parsed text (to reparse on demand if parser was updated)
}
