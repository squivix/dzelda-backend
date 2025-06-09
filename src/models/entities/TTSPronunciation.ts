import {Entity, Index, ManyToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";

@Entity({tableName: "tts_pronunciation"})
@Index({properties: ["voice"]})
@Index({properties: ["vocab"]})
@Index({properties: ["vocabVariant"]})
export class TTSPronunciation extends CustomBaseEntity {
    @Property({type: types.string, length: 500})
    url: string = "";

    @Property({type: types.datetime, defaultRaw: "now()"})
    addedOn!: Date;

    @ManyToOne({entity: () => TTSVoice, deleteRule: "restrict", updateRule: "cascade"})
    voice!: TTSVoice;

    @ManyToOne({entity: () => Vocab, deleteRule: "cascade", updateRule: "cascade"})
    vocab!: Vocab;

    @ManyToOne({entity: () => VocabVariant, deleteRule: "set null", updateRule: "cascade", nullable: true, default: null})
    vocabVariant!: VocabVariant;

    [OptionalProps]?: "addedOn"|"vocabVariant"
}
