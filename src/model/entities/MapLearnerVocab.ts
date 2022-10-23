import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {Vocab} from "./Vocab.js";
import {Profile} from "./Profile.js";

@Entity()
@Unique({properties: ["learner", "vocab"]})
export class MapLearnerVocab extends CustomBaseEntity {
    @ManyToOne({entity: () => Profile})
    learner!: Profile;

    @ManyToOne({entity: () => Vocab})
    vocab!: Vocab;
}