import {Entity, Index, ManyToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";

@Entity()
@Index({properties: ["recipient"]})
export class Notification extends CustomBaseEntity {
    @Property({type: types.string})
    text!: string;

    @Property({type: types.datetime, defaultRaw: "now()"})
    createdDate!: Date;

    @ManyToOne({entity: () => Profile, deleteRule: "cascade", updateRule: "cascade"})
    recipient!: Profile;

    [OptionalProps]?: "createdDate";
}
