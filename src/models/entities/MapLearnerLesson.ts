import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {Profile} from "@/src/models/entities/Profile.js";

@Entity()
@Unique({properties: ["lesson", "learner"]})
export class MapLearnerLesson extends CustomBaseEntity {
    @ManyToOne({entity: () => Lesson, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    lesson!: Lesson;

    @ManyToOne({entity: () => Profile, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    learner!: Profile;
}
