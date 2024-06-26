import {Entity, Enum, Index, ManyToOne, OptionalProps, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {VocabLevel} from "dzelda-common";

@Entity()
@Unique({properties: ["vocab", "learner"]})
@Index({properties: ["vocab"]})
@Index({properties: ["learner"]})
export class MapLearnerVocab extends CustomBaseEntity {
    @ManyToOne({entity: () => Vocab, deleteRule: "cascade", updateRule: "cascade"})
    vocab!: Vocab;

    @ManyToOne({entity: () => Profile, deleteRule: "cascade", updateRule: "cascade"})
    learner!: Profile;

    @Enum({items: () => VocabLevel, type: types.enum, default: VocabLevel.LEVEL_1})
    level: VocabLevel = VocabLevel.LEVEL_1;

    @Property({type: types.string, length: 2048, default: ""})
    notes: string = "";

    @Property({type: types.datetime, defaultRaw: "now()"})
    savedOn!: Date;

    [OptionalProps]?: "level" | "notes" | "savedOn";
}
