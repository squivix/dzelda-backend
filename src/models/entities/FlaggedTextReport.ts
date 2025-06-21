import {Entity, Index, ManyToOne, OptionalProps, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Text} from "@/src/models/entities/Text.js";

@Entity()
@Unique({properties: ["text", "reporter"]})
@Index({properties: ["text"]})
@Index({properties: ["reporter"]})
export class FlaggedTextReport extends CustomBaseEntity {
    @ManyToOne({entity: () => Text, deleteRule: "cascade", updateRule: "cascade"})
    text!: Text;

    @ManyToOne({entity: () => Profile, nullable: true, deleteRule: "set null", updateRule: "cascade"})
    reporter!: Profile | null;

    @Property({type: types.string, length: 512})
    reasonForReporting!: string;

    @Property({type: types.text, length: 5000, default: ""})
    reportText!: string;

    @Property({type: types.boolean, default: true})
    isValid!: boolean;

    [OptionalProps]?: "reportText" | "isValid";
}
