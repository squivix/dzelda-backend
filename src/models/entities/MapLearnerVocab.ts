import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Profile} from "@/src/models/entities/Profile.js";

@Entity()
@Unique({properties: ["learner", "vocab"]})
export class MapLearnerVocab extends CustomBaseEntity {
    @ManyToOne({entity: () => Vocab})
    vocab!: Vocab;

    @ManyToOne({entity: () => Profile})
    learner!: Profile;
}