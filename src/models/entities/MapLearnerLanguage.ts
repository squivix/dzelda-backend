import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Language} from "@/src/models/entities/Language.js";

@Entity()
@Unique({properties: ["learner", "language"]})
export class MapLearnerLanguage extends CustomBaseEntity {
    constructor(learner: Profile, language: Language) {
        super();
        this.learner = learner;
        this.language = language;
    }

    @ManyToOne({entity: () => Language})
    language!: Language;

    @ManyToOne({entity: () => Profile})
    learner!: Profile;
}