import {Entity, Index, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Collection} from "@/src/models/entities/Collection.js";

@Entity()
@Unique({properties: ["collection", "bookmarker"]})
@Index({properties: ["collection"]})
@Index({properties: ["bookmarker"]})
export class CollectionBookmark extends CustomBaseEntity {
    @ManyToOne({entity: () => Collection, deleteRule: "cascade", updateRule: "cascade"})
    collection!: Collection;

    @ManyToOne({entity: () => Profile, deleteRule: "cascade", updateRule: "cascade"})
    bookmarker!: Profile;
}
