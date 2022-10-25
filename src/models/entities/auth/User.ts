import {Entity, OneToOne, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "../CustomBaseEntity.js";
import {Profile} from "../Profile.js";


@Entity()
export class User extends CustomBaseEntity {
    @Property({type: types.string, length: 20})
    username!: string;

    @Property({type: types.string, length: 255})
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

}
