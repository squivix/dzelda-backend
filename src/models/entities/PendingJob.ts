import {Entity, Index, ManyToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {JobType} from "@/src/utils/pending-jobs/checkPendingJobs.js";

@Entity()
@Index({properties: ["initiator"]})
export class PendingJob extends CustomBaseEntity {
    @Property({type: types.string})
    jobType!: JobType;

    @Property({type: types.datetime, defaultRaw: "now()"})
    createdDate!: Date;

    @Property({type: types.json})
    jobParams!: Record<string, any>;

    @ManyToOne({entity: () => Profile, nullable: true, deleteRule: "cascade", updateRule: "cascade"})
    initiator!: Profile;

    [OptionalProps]?: "createdDate";
}
