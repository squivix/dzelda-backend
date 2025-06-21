import {Entity, Index, ManyToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Text} from "@/src/models/entities/Text.js";
import {Profile} from "@/src/models/entities/Profile.js";

@Entity()
@Index({properties: ["text", "pastViewer"]})
@Index({properties: ["text"]})
@Index({properties: ["pastViewer"]})
export class TextHistoryEntry extends CustomBaseEntity {
    @ManyToOne({entity: () => Text, deleteRule: "cascade", updateRule: "cascade"})
    text!: Text;

    @ManyToOne({entity: () => Profile, nullable: true, deleteRule: "set null", updateRule: "cascade"})
    pastViewer!: Profile | null;

    @Property({type: types.datetime, defaultRaw: "now()"})
    timeViewed!: Date;

    [OptionalProps]?: "timeViewed";
}
