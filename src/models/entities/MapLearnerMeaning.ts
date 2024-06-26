import {Entity, Index, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Meaning} from "@/src/models/entities/Meaning.js";

@Entity()
@Unique({properties: ["meaning", "learner"]})
@Index({properties: ["meaning"]})
@Index({properties: ["learner"]})
export class MapLearnerMeaning extends CustomBaseEntity {
    @ManyToOne({entity: () => Meaning, deleteRule: "cascade", updateRule: "cascade"})
    meaning!: Meaning;

    @ManyToOne({entity: () => Profile, deleteRule: "cascade", updateRule: "cascade"})
    learner!: Profile;

}
