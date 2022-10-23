import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {Profile} from "./Profile.js";
import {Meaning} from "./Meaning.js";

@Entity()
@Unique({properties: ["learner", "meaning"]})
export class MapLearnerMeaning extends CustomBaseEntity {
    @ManyToOne({entity: () => Profile})
    learner!: Profile;

    @ManyToOne({entity: () => Meaning})
    meaning!: Meaning;

}