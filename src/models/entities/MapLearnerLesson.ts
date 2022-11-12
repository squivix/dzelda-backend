import {Entity, ManyToOne} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {Profile} from "@/src/models/entities/Profile.js";

@Entity()
export class MapLearnerLesson extends CustomBaseEntity {
    @ManyToOne({entity: () => Lesson})
    lesson!: Lesson;

    @ManyToOne({entity: () => Profile})
    learner!: Profile;
}