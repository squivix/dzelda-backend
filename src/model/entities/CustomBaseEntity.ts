import {BaseEntity, PrimaryKey, types} from "@mikro-orm/core";

export abstract class CustomBaseEntity extends BaseEntity<CustomBaseEntity, "id"> {
    @PrimaryKey({type: types.integer})
    id!: number;
}