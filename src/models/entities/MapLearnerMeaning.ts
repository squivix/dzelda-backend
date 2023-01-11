import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Meaning} from "@/src/models/entities/Meaning.js";

@Entity()
@Unique({properties: ["learner", "meaning"]})
export class MapLearnerMeaning extends CustomBaseEntity {
    @ManyToOne({entity: () => Meaning})
    meaning!: Meaning;

    @ManyToOne({entity: () => Profile})
    learner!: Profile;

}