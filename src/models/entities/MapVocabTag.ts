import {Entity, Index, ManyToOne, Unique} from "@mikro-orm/core";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";

@Entity()
@Unique({properties: ["tag", "vocab"]})
@Index({properties: ["tag"]})
@Index({properties: ["vocab"]})
export class MapVocabTag extends CustomBaseEntity {
    @ManyToOne({entity: () => VocabTag, deleteRule: "cascade", updateRule: "cascade"})
    tag!: VocabTag;

    @ManyToOne({entity: () => Vocab, deleteRule: "cascade", updateRule: "cascade"})
    vocab!: Vocab;
}
