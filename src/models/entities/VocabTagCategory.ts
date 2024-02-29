import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Collection, Entity, OneToMany, Property, types} from "@mikro-orm/core";
import {VocabTag} from "@/src/models/entities/VocabTag.js";

@Entity()
export class VocabTagCategory extends CustomBaseEntity {
    @Property({type: types.string})
    name!: string;

    @OneToMany({entity: () => VocabTag, mappedBy: (tag) => tag.category})
    tags: Collection<VocabTag> = new Collection<VocabTag>(this);
}
