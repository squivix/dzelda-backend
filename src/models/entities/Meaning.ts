import {Collection, Entity, Filter, Formula, Index, ManyToMany, ManyToOne, OptionalProps, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {Attribution} from "@/src/models/interfaces/Attribution.js";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";

@Entity()
@Unique({properties: ["vocab", "text", "language"]})
@Index({properties: ["vocab"]})
@Index({properties: ["vocabVariant"]})
@Index({properties: ["language"]})
@Index({properties: ["addedBy"]})
@Index({properties: ["attributionSource"]})
export class Meaning extends CustomBaseEntity {
    @Property({type: types.string, length: 500})
    text!: string;

    @ManyToOne({entity: () => Vocab, inversedBy: (vocab) => vocab.meanings, deleteRule: "cascade", updateRule: "cascade"})
    vocab!: Vocab;

    @ManyToOne({entity: () => VocabVariant, inversedBy: (vocabVariant) => vocabVariant.meanings, deleteRule: "set null", updateRule: "cascade", nullable: true, default: null})
    vocabVariant!: VocabVariant | null;

    @ManyToOne({
        entity: () => Profile,
        inversedBy: (profile) => profile.meaningsAdded,
        nullable: true,
        deleteRule: "set null",
        updateRule: "cascade"
    })
    addedBy!: Profile | null;

    @Property({type: types.datetime, defaultRaw: "now()"})
    addedOn!: Date;

    @ManyToOne({entity: () => AttributionSource, nullable: true, deleteRule: "set null", updateRule: "cascade"})
    attributionSource!: AttributionSource | null;

    @Property({type: types.json, nullable: true})
    attribution: Attribution | null = null;

    @ManyToOne({entity: () => TranslationLanguage, inversedBy: (language) => language.meaningsSavedIn, deleteRule: "cascade", updateRule: "cascade"})
    language!: TranslationLanguage;

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
