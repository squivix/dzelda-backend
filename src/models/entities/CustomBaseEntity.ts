import {BaseEntity, PrimaryKey, types} from "@mikro-orm/core";

export abstract class CustomBaseEntity {
    @PrimaryKey({type: types.integer})
    id!: number;
}
