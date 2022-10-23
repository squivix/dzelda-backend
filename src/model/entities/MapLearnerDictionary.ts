import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {Profile} from "./Profile.js";
import {Dictionary} from "./Dictionary.js";

@Entity()
@Unique({properties: ["learner", "dictionary"]})
export class MapLearnerDictionary extends CustomBaseEntity {
    @ManyToOne({entity: () => Profile})
    learner!: Profile;

    @ManyToOne({entity: () => Dictionary})
    dictionary!: Dictionary;
}