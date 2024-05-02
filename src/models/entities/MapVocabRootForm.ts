import {Entity, Index, ManyToOne, Unique} from "@mikro-orm/core";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";

@Entity()
@Unique({properties: ["vocab", "rootForm"]})
@Index({properties: ["rootForm"]})
@Index({properties: ["vocab"]})
export class MapVocabRootForm extends CustomBaseEntity {
    @ManyToOne({entity: () => Vocab, deleteRule: "cascade", updateRule: "cascade"})
    vocab!: Vocab;

    @ManyToOne({entity: () => Vocab, deleteRule: "cascade", updateRule: "cascade"})
    rootForm!: Vocab;
}
