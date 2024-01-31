import {Entity, ManyToOne, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import {Vocab} from "@/src/models/entities/Vocab.js";

@Entity({tableName: "tts_pronunciation"})
export class TTSPronunciation extends CustomBaseEntity {
    @Property({type: types.string, length: 500})
    url: string = "";

    @Property({type: types.datetime, defaultRaw: "now()"})
    addedOn!: Date;

    @ManyToOne({entity: () => TTSVoice, onDelete: "restrict", onUpdateIntegrity: "cascade"})
    voice!: TTSVoice;

    @ManyToOne({entity: () => Vocab, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    vocab!: Vocab;
}
