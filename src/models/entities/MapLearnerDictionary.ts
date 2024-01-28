import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Entity, Index, ManyToOne, Property, types, Unique} from "@mikro-orm/core";
import {Profile} from "@/src/models/entities/Profile.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";

@Entity()
@Unique({properties: ["dictionary", "learner"]})
@Index({properties: ["dictionary"]})
@Index({properties: ["learner"]})
export class MapLearnerDictionary extends CustomBaseEntity {
    @ManyToOne({entity: () => Dictionary, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    dictionary!: Dictionary;

    @ManyToOne({entity: () => Profile, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    learner!: Profile;

    @Property({type: types.integer, default: 0})
    order!: number;
}
