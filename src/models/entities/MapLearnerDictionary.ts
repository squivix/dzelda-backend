import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {Profile} from "@/src/models/entities/Profile.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";

@Entity()
@Unique({properties: ["dictionary", "learner"]})
export class MapLearnerDictionary extends CustomBaseEntity {
    @ManyToOne({entity: () => Dictionary})
    dictionary!: Dictionary;

    @ManyToOne({entity: () => Profile})
    learner!: Profile;
}
