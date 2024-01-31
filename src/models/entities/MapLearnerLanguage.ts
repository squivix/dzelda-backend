import {Entity, Index, ManyToOne, OptionalProps, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Language} from "@/src/models/entities/Language.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";

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

    @ManyToOne({entity: () => Language, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    language!: Language;

    @ManyToOne({entity: () => Profile, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    learner!: Profile;

    @Property({type: types.datetime, defaultRaw: "now()"})
    startedLearningOn!: Date;

    @Property({type: types.datetime, defaultRaw: "now()", hidden: true})
    lastOpened!: Date;

    @ManyToOne({entity: () => TTSVoice, inversedBy: (ttsVoice) => ttsVoice.prefererLanguageMappings, onDelete: "set null", onUpdateIntegrity: "cascade", nullable: true, default: null})
    preferredTtsVoice!: TTSVoice | null;

    [OptionalProps]?: "startedLearningOn" | "lastOpened";
}
