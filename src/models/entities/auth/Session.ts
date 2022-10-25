import {Entity, OneToOne, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "../CustomBaseEntity.js";
import {User} from "./User.js";

@Entity()
export class Session extends CustomBaseEntity {
    @Property({type: types.string, length: 255})
    @Unique()
    token!: string;

    @OneToOne({entity: () => User, owner: true})
    @Unique()
    user!: User;

    @Property({type: types.datetime, defaultRaw: "now()"})
    createdAt!: Date;
}