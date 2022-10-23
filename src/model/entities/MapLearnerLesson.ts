import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Entity, ManyToOne} from "@mikro-orm/core";
import {Lesson} from "./Lesson.js";
import {Profile} from "./Profile.js";

@Entity()
export class MapLearnerLesson extends CustomBaseEntity {
    @ManyToOne({entity: () => Lesson})
    lesson!: Lesson;

    @ManyToOne({entity: () => Profile})
    learner!: Profile;
}