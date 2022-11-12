import {Entity, EntityRepositoryType, OneToOne, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "../CustomBaseEntity.js";
import {User} from "./User.js";
import {SessionRepo} from "../../repos/auth/SessionRepo.js";

@Entity({customRepository: () => SessionRepo})
export class Session extends CustomBaseEntity {
    constructor(user: User, token: string) {
        super();
        this.user = user;
        this.token = token;
    }

    @Property({type: types.string, length: 255})
    @Unique()
    token!: string;

    @OneToOne({entity: () => User, inversedBy: (user: User) => user.session, owner: true})
    user!: User;

    @Property({type: types.datetime, defaultRaw: "now()"})
    createdAt!: Date;

    [EntityRepositoryType]?: SessionRepo;
}