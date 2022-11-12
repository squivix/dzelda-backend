import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {Profile} from "@/src/models/entities/Profile.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";

@Entity()
@Unique({properties: ["learner", "dictionary"]})
export class MapLearnerDictionary extends CustomBaseEntity {
    @ManyToOne({entity: () => Profile})
    learner!: Profile;

    @ManyToOne({entity: () => Dictionary})
    dictionary!: Dictionary;
}