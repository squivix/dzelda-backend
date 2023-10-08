import {Entity, ManyToOne, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Course} from "@/src/models/entities/Course.js";

@Entity()
@Unique({properties: ["course", "bookmarker"]})
export class MapBookmarkerCourse extends CustomBaseEntity {
    @ManyToOne({entity: () => Course, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    course!: Course;

    @ManyToOne({entity: () => Profile, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    bookmarker!: Profile;
}
