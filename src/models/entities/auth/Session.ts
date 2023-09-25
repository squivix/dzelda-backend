import {Entity, Formula, ManyToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {User} from "@/src/models/entities/auth/User.js";

@Entity()
export class Session extends CustomBaseEntity {
    constructor(user: User, token: string) {
        super();
        this.user = user;
        this.token = token;
    }

    @Property({type: types.string, length: 255})
    token!: string;

    @ManyToOne({entity: () => User})
    user!: User;

    @Property({type: types.datetime, defaultRaw: "now()"})
    createdAt!: Date;

    @Property({type: types.datetime, defaultRaw: "now() + interval '1 month'"})
    expiresOn!: Date;

    @Formula((alias: string) => `${alias}.expires_on < now()`, {
        type: types.boolean,
        lazy: false
    })
    isExpired!: boolean;

    [OptionalProps]?: "createdAt" | "expiresOn" | "isExpired";
}
