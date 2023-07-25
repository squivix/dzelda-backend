import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {Vocab} from "@/src/models/entities/Vocab.js";

@Entity()
@Unique({properties: ["vocab", "lesson"]})
export class MapLessonVocab extends CustomBaseEntity {
    @ManyToOne({entity: () => Vocab})
    vocab!: Vocab;

    @ManyToOne({entity: () => Lesson})
    lesson!: Lesson;

}
