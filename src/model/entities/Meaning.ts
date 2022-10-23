import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Entity, ManyToMany, ManyToOne, Property, types, Unique} from "@mikro-orm/core";
import {Vocab} from "./Vocab.js";
import {Profile} from "./Profile.js";
import {Language} from "./Language.js";
import {MapLearnerMeaning} from "./MapLearnerMeaning.js";

@Entity()
@Unique({properties: ["vocab", "text", "language"]})
export class Meaning extends CustomBaseEntity {
    @Property({type: types.string, length: 1000})
    text!: string;

    @ManyToOne({entity: () => Vocab, inversedBy: (vocab) => vocab.meanings})
    vocab!: Vocab;

    @ManyToOne({entity: () => Profile, inversedBy: (profile) => profile.meaningsAdded})
    addedBy!: Profile;

    @Property({type: types.datetime, defaultRaw: "now()"})
    addedOn!: Date;

    @ManyToOne({entity: () => Language, inversedBy: (language) => language.meaningsSavedIn})
    language!: Language;

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (learner: Profile) => learner.meaningsLearning,
        pivotEntity: () => MapLearnerMeaning,
    })
    learners!: Profile;
}