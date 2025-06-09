import {Entity, Index, ManyToOne, Unique} from "@mikro-orm/core";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";

@Entity()
@Unique({properties: ["tag", "vocabVariant"]})
@Index({properties: ["tag"]})
@Index({properties: ["vocabVariant"]})
export class MapVocabVariantTag extends CustomBaseEntity {
    @ManyToOne({entity: () => VocabTag, deleteRule: "cascade", updateRule: "cascade"})
    tag!: VocabTag;

    @ManyToOne({entity: () => VocabVariant, deleteRule: "cascade", updateRule: "cascade"})
    vocabVariant!: VocabVariant;
}
