import {Entity, Index, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Text} from "@/src/models/entities/Text.js";

@Entity()
@Unique({properties: ["text", "bookmarker"]})
@Index({properties: ["text"]})
@Index({properties: ["bookmarker"]})
export class TextBookmark extends CustomBaseEntity {
    @ManyToOne({entity: () => Text, deleteRule: "cascade", updateRule: "cascade"})
    text!: Text;

    @ManyToOne({entity: () => Profile, deleteRule: "cascade", updateRule: "cascade"})
    bookmarker!: Profile;
}
