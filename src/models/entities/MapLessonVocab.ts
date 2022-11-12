import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {Vocab} from "@/src/models/entities/Vocab.js";

@Entity()
@Unique({properties: ["lesson", "vocab"]})
export class MapLessonVocab extends CustomBaseEntity {
    @ManyToOne({entity: () => Lesson})
    lesson!: Lesson;

    @ManyToOne({entity: () => Vocab})
    vocab!: Vocab;

}