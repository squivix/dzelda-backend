import {Collection, Entity, Enum, ManyToOne, OptionalProps, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {Meaning} from "@/src/models/entities/Meaning.js";

@Entity()
@Unique({properties: ["learner", "vocab"]})
export class MapLearnerVocab extends CustomBaseEntity {
    @ManyToOne({entity: () => Vocab})
    vocab!: Vocab;

    @ManyToOne({entity: () => Profile})
    learner!: Profile;

    @Enum({items: () => VocabLevel, type: types.enum, default: VocabLevel.LEVEL_1})
    level!: VocabLevel;

    @Property({type: types.string, default: "", length: 2048})
    notes!: string;

    [OptionalProps]?: "level" | "notes";

    @Property({persist: false, type: () => Meaning})
    userMeanings?: Meaning[];

}