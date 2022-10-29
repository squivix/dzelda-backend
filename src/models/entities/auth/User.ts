import {Entity, EntityRepositoryType, OneToOne, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "../CustomBaseEntity.js";
import {Profile} from "../Profile.js";
import UserRepo from "../../repos/auth/UserRepo.js";
import {Session} from "./Session.js";


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

    @Property({type: types.boolean, default: false})
    isStaff!: boolean;

    @Property({type: types.boolean, default: false})
    isAdmin!: boolean;

    @Property({type: types.datetime, defaultRaw: "now()"})
    accountCreatedAt!: Date;

    @Property({type: types.datetime, defaultRaw: "now()"})
    lastLogin!: Date;

    @OneToOne({entity: () => Session, mappedBy: (session: Session) => session.user})
    session!: Session;

    [EntityRepositoryType]?: UserRepo;
}
