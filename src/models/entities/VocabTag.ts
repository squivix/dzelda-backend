import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Collection, Entity, Index, ManyToMany, ManyToOne, Property, types} from "@mikro-orm/core";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapVocabTag} from "@/src/models/entities/MapVocabTag.js";
import {VocabTagCategory} from "@/src/models/entities/VocabTagCategory.js";

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
}
