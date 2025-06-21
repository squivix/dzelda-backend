import {Collection, Entity, Index, ManyToMany, ManyToOne, OneToMany, Property, raw, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {MapVocabVariantTag} from "@/src/models/entities/MapVocabVariantTag.js";
import {Meaning} from "@/src/models/entities/Meaning.js";

@Entity()
@Unique({properties: ["text", "vocab"]})
@Index({properties: ["vocab"]})
export class VocabVariant extends CustomBaseEntity {
    @Property({type: types.string, length: 1024})
    text!: string;

    @ManyToOne({entity: () => Vocab, inversedBy: (vocab) => vocab.vocabVariants, deleteRule: "cascade", updateRule: "cascade"})
    vocab!: Vocab;

    @OneToMany({
        entity: () => Meaning, mappedBy: (meaning: Meaning) => meaning.vocabVariant,
        orderBy: {learnersCount: "desc", [raw(alias => `length(${alias}.text)`)]: "asc"}
    })
    meanings: Collection<Meaning> = new Collection<Meaning>(this);

    @OneToMany({entity: () => TTSPronunciation, mappedBy: (ttsPronunciation: TTSPronunciation) => ttsPronunciation.vocabVariant})
    ttsPronunciations: Collection<TTSPronunciation> = new Collection<TTSPronunciation>(this);

    @ManyToMany({
        entity: () => VocabTag,
        mappedBy: (tag: VocabTag) => tag.vocabVariants,
        pivotEntity: () => MapVocabVariantTag,
    })
    tags: Collection<VocabTag> = new Collection<VocabTag>(this);

}
