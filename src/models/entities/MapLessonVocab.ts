import {Entity, Index, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {Vocab} from "@/src/models/entities/Vocab.js";

@Entity()
@Unique({properties: ["vocab", "lesson"]})
@Index({properties: ["lesson"]})
@Index({properties: ["vocab"]})
export class MapLessonVocab extends CustomBaseEntity {
    @ManyToOne({entity: () => Vocab, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    vocab!: Vocab;

    @ManyToOne({entity: () => Lesson, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    lesson!: Lesson;

}
