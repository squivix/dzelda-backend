import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Collection, Entity, Index, ManyToMany, ManyToOne, Property, types} from "@mikro-orm/core";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapVocabTag} from "@/src/models/entities/MapVocabTag.js";
import {VocabTagCategory} from "@/src/models/entities/VocabTagCategory.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";
import {MapVocabVariantTag} from "@/src/models/entities/MapVocabVariantTag.js";

@Entity()
@Index({properties: ["category"]})
export class VocabTag extends CustomBaseEntity {
    @Property({type: types.string})
    name!: string;

    @ManyToOne({entity: () => VocabTagCategory, inversedBy: (category) => category.tags, nullable: true, deleteRule: "set null", updateRule: "cascade"})
    category!: VocabTagCategory;

    @ManyToMany({
        entity: () => Vocab,
        inversedBy: (vocab: Vocab) => vocab.tags,
        pivotEntity: () => MapVocabTag,
        joinColumn: "tag_id",
        inverseJoinColumn: "vocab_id"
    })
    vocabs: Collection<Vocab> = new Collection<Vocab>(this);


    @ManyToMany({
        entity: () => VocabVariant,
        inversedBy: (vocabVariant: VocabVariant) => vocabVariant.tags,
        pivotEntity: () => MapVocabVariantTag,
        joinColumn: "tag_id",
        inverseJoinColumn: "vocab_variant_id"
    })
    vocabVariants: Collection<VocabVariant> = new Collection<VocabVariant>(this);


}
