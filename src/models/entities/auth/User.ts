import {Entity, OneToOne, OptionalProps, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {PasswordResetToken} from "@/src/models/entities/auth/PasswordResetToken.js";
import {EmailConfirmationToken} from "@/src/models/entities/auth/EmailConfirmationToken.js";


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

    @Property({type: types.boolean, default: false})
    isEmailConfirmed!: boolean;

    @Property({type: types.string, length: 255, hidden: true})
    password!: string;

    @OneToOne({entity: () => Profile, mappedBy: (profile: Profile) => profile.user, nullable: true})
    profile!: Profile | null;

    @Property({type: types.boolean, hidden: true, default: false})
    isStaff: boolean = false;

    @Property({type: types.boolean, hidden: true, default: false})
    isAdmin: boolean = false;

    @Property({type: types.datetime, hidden: true, defaultRaw: "now()"})
    accountCreatedAt!: Date;

    @Property({type: types.datetime, hidden: true, defaultRaw: "now()"})
    lastLogin!: Date;

    @OneToOne({
        entity: () => PasswordResetToken,
        mappedBy: (passwordResetToken: PasswordResetToken) => passwordResetToken.user,
        hidden: true,
        lazy: true
    })
    passwordResetToken?: PasswordResetToken | null;

    @OneToOne({
        entity: () => EmailConfirmationToken,
        mappedBy: (emailConfirmationToken: EmailConfirmationToken) => emailConfirmationToken.user,
        hidden: true,
        lazy: true
    })
    emailConfirmToken?: EmailConfirmationToken | null;

    [OptionalProps]?: "isEmailConfirmed" | "isStaff" | "isAdmin" | "accountCreatedAt" | "lastLogin";
}


export class AnonymousUser {
    readonly username = "anonymous";
    readonly profile: Profile | null = null;
}
