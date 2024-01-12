import {Entity, Formula, ManyToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {User} from "@/src/models/entities/auth/User.js";

@Entity()
export class FileUploadRequest extends CustomBaseEntity {
    @Property({type: types.string})
    fileField!: string;

    @ManyToOne({entity: () => User, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    user!: User;

    @Property({type: types.string})
    fileUrl!: string;

    @Property({type: types.string})
    objectKey!: string;

    @Property({type: types.datetime, defaultRaw: "now() + interval '5 minutes'"})
    expiresOn!: Date;

    @Formula((alias: string) => `${alias}.expires_on < now()`, {
        type: types.boolean,
        lazy: false
    })
    isExpired!: boolean;

    [OptionalProps]?: "expiresOn" | "isExpired";
}
