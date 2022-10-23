import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Lesson} from "./Lesson.js";
import {Vocab} from "./Vocab.js";

@Entity()
@Unique({properties: ["lesson", "vocab"]})
export class MapLessonVocab extends CustomBaseEntity {
    @ManyToOne({entity: () => Lesson})
    lesson!: Lesson;

    @ManyToOne({entity: () => Vocab})
    vocab!: Vocab;

}