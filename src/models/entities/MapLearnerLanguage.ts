import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Profile} from "./Profile.js";
import {Language} from "./Language.js";

@Entity()
@Unique({properties: ["learner", "language"]})
export class MapLearnerLanguage extends CustomBaseEntity {
    @ManyToOne({entity: () => Profile})
    learner!: Profile;

    @ManyToOne({entity: () => Language})
    language!: Language;
}