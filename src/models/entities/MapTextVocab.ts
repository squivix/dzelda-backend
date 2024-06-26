import {Entity, Index, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Text} from "@/src/models/entities/Text.js";
import {Vocab} from "@/src/models/entities/Vocab.js";

@Entity()
@Unique({properties: ["vocab", "text"]})
@Index({properties: ["text"]})
@Index({properties: ["vocab"]})
export class MapTextVocab extends CustomBaseEntity {
    @ManyToOne({entity: () => Vocab, deleteRule: "cascade", updateRule: "cascade"})
    vocab!: Vocab;

    @ManyToOne({entity: () => Text, deleteRule: "cascade", updateRule: "cascade"})
    text!: Text;

}
