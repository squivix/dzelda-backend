import {Collection, Entity, ManyToMany, ManyToOne, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";

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
        joinColumn: "meaning_id",
        inverseJoinColumn: "learner_id"
    })
    learners: Collection<Profile> = new Collection<Profile>(this);
}