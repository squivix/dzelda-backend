import {Entity, OneToOne, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Session} from "@/src/models/entities/auth/Session.js";


@Entity()
export class User extends CustomBaseEntity {
    constructor(username: string, email: string, password: string) {
        super();
        this.username = username;
        this.email = email;
        this.password = password;
    }

    @Property({type: types.string, length: 20})
    @Unique()
    username!: string;

    @Property({type: types.string, length: 255})
    @Unique()
    email!: string;

    @Property({type: types.string, length: 255, hidden: true})
    password!: string;

    @OneToOne({entity: () => Profile, mappedBy: (profile: Profile) => profile.user})
    profile!: Profile;

    @Property({type: types.boolean, hidden: true, default: false})
    isStaff: boolean = false;

    @Property({type: types.boolean, hidden: true, default: false})
    isAdmin: boolean = false;

    @Property({type: types.datetime, hidden: true, defaultRaw: "now()"})
    accountCreatedAt!: Date;

    @Property({type: types.datetime, hidden: true, defaultRaw: "now()"})
    lastLogin!: Date;

    @OneToOne({entity: () => Session, mappedBy: (session: Session) => session.user, hidden: true})
    session!: Session;
}


export class AnonymousUser {
    readonly username = "anonymous";
    readonly profile: Profile | null = null;
}
