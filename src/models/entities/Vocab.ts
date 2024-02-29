import {Text} from "@/src/models/entities/Text.js";
import {Collection, Entity, Formula, Index, ManyToMany, ManyToOne, OneToMany, OptionalProps, Property, raw, types, Unique} from "@mikro-orm/core";
import {MapTextVocab} from "@/src/models/entities/MapTextVocab.js";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabRepo} from "@/src/models/repos/VocabRepo.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {MapVocabTag} from "@/src/models/entities/MapVocabTag.js";
import {MapVocabRootForm} from "@/src/models/entities/MapVocabRootForm.js";

@Entity({repository: () => VocabRepo})
@Unique({properties: ["language", "text"]})
@Index({properties: ["language"]})
export class Vocab extends CustomBaseEntity {
    @Property({type: types.string, length: 255})
    text!: string;

    @ManyToOne({
        entity: () => Language,
        inversedBy: (language: Language) => language.vocabs,
        deleteRule: "cascade",
        updateRule: "cascade"
    })
    language!: Language;

    @Property({type: types.boolean, default: false})
    isPhrase: boolean = false;

    @OneToMany({
        entity: () => Meaning, mappedBy: (meaning: Meaning) => meaning.vocab,
        orderBy: {learnersCount: "desc", [raw(alias => `length(${alias}.text)`)]: "asc"}
    })
    meanings: Collection<Meaning> = new Collection<Meaning>(this);

    @OneToMany({
        entity: () => Meaning, mappedBy: (meaning: Meaning) => meaning.vocab,
        orderBy: {learnersCount: "desc", text: "asc"},
        lazy: true,
    })
    learnerMeanings: Collection<Meaning> = new Collection<Meaning>(this);

    @ManyToMany({
        entity: () => Text,
        inversedBy: (text: Text) => text.vocabs,
        pivotEntity: () => MapTextVocab
    })
    textsAppearingIn: Collection<Text> = new Collection<Text>(this);

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (profile: Profile) => profile.vocabsLearning,
        pivotEntity: () => MapLearnerVocab,
        joinColumn: "vocab_id",
        inverseJoinColumn: "learner_id",
    })
    learners: Collection<Profile> = new Collection<Profile>(this);

    @ManyToMany({
        entity: () => VocabTag,
        mappedBy: (tag: VocabTag) => tag.vocabs,
        pivotEntity: () => MapVocabTag,
    })
    tags: Collection<VocabTag> = new Collection<VocabTag>(this);


    @ManyToMany({
        entity: () => Vocab,
        inversedBy: (vocab: Vocab) => vocab.derivedForms,
        pivotEntity: () => MapVocabRootForm,
    })
    rootForms: Collection<Vocab> = new Collection<Vocab>(this);

    @ManyToMany({
        entity: () => Vocab,
        mappedBy: (vocab: Vocab) => vocab.rootForms,
        pivotEntity: () => MapVocabRootForm,
    })
    derivedForms: Collection<Vocab> = new Collection<Vocab>(this);

    @OneToMany({entity: () => TTSPronunciation, mappedBy: (ttsPronunciation: TTSPronunciation) => ttsPronunciation.vocab})
    ttsPronunciations: Collection<TTSPronunciation> = new Collection<TTSPronunciation>(this);

    [OptionalProps]?: "isPhrase";

    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_learner_vocab.learner_id) FROM map_learner_vocab WHERE "vocab_id" = ${alias}.id AND "level" != ${VocabLevel.IGNORED})`, {
        type: "number"
    })
    learnersCount?: number;


    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_text_vocab.text_id) FROM map_text_vocab WHERE vocab_id = ${alias}.id)`, {
        type: "number"
    })
    textsCount?: number;

}
