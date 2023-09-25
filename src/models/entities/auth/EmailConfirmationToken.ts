import {Entity, Formula, OneToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {User} from "@/src/models/entities/auth/User.js";

@Entity()
export class EmailConfirmationToken extends CustomBaseEntity {

    @Property({type: types.string, length: 255})
    token!: string;

    @Property({type: types.datetime, defaultRaw: "now() + interval '1 hour'"})
    expiresOn!: Date;

    @OneToOne({entity: () => User, owner: true, nullable: false})
    user!: User;

    @Property({type: types.string, length: 255})
    email!: string;

    @Formula((alias: string) => `${alias}.expires_on < now()`, {
        type: types.boolean,
        lazy: false
    })
    isExpired!: boolean;


    [OptionalProps]?: "expiresOn" | "isExpired";
}


