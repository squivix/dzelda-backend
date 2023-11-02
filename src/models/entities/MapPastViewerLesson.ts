import {Entity, Index, ManyToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {Profile} from "@/src/models/entities/Profile.js";

@Entity()
@Index({properties: ["lesson", "pastViewer"]})
@Index({properties: ["lesson"]})
@Index({properties: ["pastViewer"]})
export class MapPastViewerLesson extends CustomBaseEntity {
    @ManyToOne({entity: () => Lesson, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    lesson!: Lesson;

    @ManyToOne({entity: () => Profile, nullable: true, onDelete: "set null", onUpdateIntegrity: "cascade"})
    pastViewer!: Profile;

    @Property({type: types.datetime, defaultRaw: "now()"})
    timeViewed!: Date;

    [OptionalProps]?: "timeViewed";
}
