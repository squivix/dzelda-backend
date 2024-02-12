import {Collection, Entity, Formula, Index, ManyToMany, ManyToOne, OptionalProps, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {Attribution} from "@/src/models/interfaces/Attribution.js";

@Entity()
@Unique({properties: ["vocab", "text", "language"]})
@Index({properties: ["vocab"]})
@Index({properties: ["language"]})
@Index({properties: ["addedBy"]})
export class Meaning extends CustomBaseEntity {
    @Property({type: types.string, length: 500})
    text!: string;

    @ManyToOne({entity: () => Vocab, inversedBy: (vocab) => vocab.meanings, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    vocab!: Vocab;

    @ManyToOne({
        entity: () => Profile,
        inversedBy: (profile) => profile.meaningsAdded,
        nullable: true,
        onDelete: "set null",
        onUpdateIntegrity: "cascade"
    })
    addedBy!: Profile | null;

    @Property({type: types.datetime, defaultRaw: "now()"})
    addedOn!: Date;

    @Property({type: types.json, nullable: true})
    attribution!: Attribution;

    @ManyToOne({entity: () => Language, inversedBy: (language) => language.meaningsSavedIn, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    language!: Language;

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (learner: Profile) => learner.meaningsLearning,
        pivotEntity: () => MapLearnerMeaning,
        joinColumn: "meaning_id",
        inverseJoinColumn: "learner_id"
    })
    learners: Collection<Profile> = new Collection<Profile>(this);

    @Formula((alias: string) => `(SELECT COUNT(learner_id) FROM map_learner_meaning WHERE meaning_id=${alias}.id)`, {type: "number"})
    learnersCount!: number;

    [OptionalProps]?: "addedOn" | "learnersCount";
}
