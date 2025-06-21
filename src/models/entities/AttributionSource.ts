import {Entity, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";

@Entity()
export class AttributionSource extends CustomBaseEntity {
    @Property({type: types.string})
    name!: string;

    @Property({type: types.string, nullable: true})
    url!: string | null;

    @Property({type: types.string, nullable: true})
    logoUrl!: string | null;
}
