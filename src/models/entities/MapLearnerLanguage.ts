import {Collection, Entity, Index, ManyToOne, OneToMany, OptionalProps, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Language} from "@/src/models/entities/Language.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import {PreferredTranslationLanguageEntry} from "@/src/models/entities/PreferredTranslationLanguageEntry.js";

@Entity()
@Unique({properties: ["language", "learner"]})
@Index({properties: ["learner"]})
@Index({properties: ["language"]})
export class MapLearnerLanguage extends CustomBaseEntity {
    constructor(learner: Profile, language: Language) {
        super();
        this.learner = learner;
        this.language = language;
    }

    @ManyToOne({entity: () => Language, deleteRule: "cascade", updateRule: "cascade"})
    language!: Language;

    @ManyToOne({entity: () => Profile, deleteRule: "cascade", updateRule: "cascade"})
    learner!: Profile;

    @Property({type: types.datetime, defaultRaw: "now()"})
    startedLearningOn!: Date;

    @Property({type: types.datetime, defaultRaw: "now()", hidden: true})
    lastOpened!: Date;

    @ManyToOne({entity: () => TTSVoice, inversedBy: (ttsVoice) => ttsVoice.prefererLanguageMappings, deleteRule: "set null", updateRule: "cascade", nullable: true, default: null})
    preferredTtsVoice!: TTSVoice | null;

    @OneToMany({
        entity: () => PreferredTranslationLanguageEntry,
        mappedBy: (preferredTranslationLanguageEntry) => preferredTranslationLanguageEntry.learnerLanguageMapping,
        orderBy: {precedenceOrder: "asc"}
    })
    preferredTranslationLanguages: Collection<PreferredTranslationLanguageEntry> = new Collection<PreferredTranslationLanguageEntry>(this);

    [OptionalProps]?: "startedLearningOn" | "lastOpened" | "preferredTranslationLanguages";
}
