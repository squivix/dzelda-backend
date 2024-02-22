import {Entity, Formula, OneToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {User} from "@/src/models/entities/auth/User.js";


@Entity()
export class PasswordResetToken extends CustomBaseEntity {

    @Property({type: types.string, length: 255})
    token!: string;

    @Property({type: types.datetime, defaultRaw: "now() + interval '1 hour'"})
    expiresOn!: Date;

    @OneToOne({entity: () => User, owner: true, nullable: false, deleteRule: "cascade", updateRule: "cascade"})
    user!: User;

    @Formula((alias: string) => `${alias}.expires_on < now()`, {
        type: types.boolean,
        lazy: false
    })
    isExpired!: boolean;
    [OptionalProps]?: "expiresOn" | "isExpired";
}


