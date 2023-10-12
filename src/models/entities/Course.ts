import {Collection, Entity, Enum, Formula, Index, ManyToMany, ManyToOne, OneToMany, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";
import {MapBookmarkerCourse} from "@/src/models/entities/MapBookmarkerCourse.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

@Entity({customRepository: () => CourseRepo})
@Index({properties: ["language"]})
@Index({properties: ["addedBy"]})
@Index({properties: ["title"]})
@Index({properties: ["addedOn"]})
export class Course extends CustomBaseEntity {

    @Property({type: types.string, length: 255})
    title!: string;

    @Property({type: types.string, length: 500, default: ""})
    description: string = "";

    @ManyToOne({entity: () => Language, inversedBy: (language) => language.courses, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    language!: Language;

    @Property({type: types.string, length: 500, default: ""})
    image: string = "";

    @Property({type: types.boolean, default: true})
    isPublic: boolean = true;

    @ManyToOne({entity: () => Profile, inversedBy: (profile) => profile.coursesAdded, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    addedBy!: Profile;

    @Property({type: types.datetime, defaultRaw: "now()"})
    addedOn!: Date;

    @Enum({items: () => LanguageLevel, type: types.enum, default: LanguageLevel.ADVANCED_1})
    level: LanguageLevel = LanguageLevel.ADVANCED_1;

    @OneToMany({entity: () => Lesson, mappedBy: (lesson) => lesson.course})
    lessons: Collection<Lesson> = new Collection<Lesson>(this);

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (user: Profile) => user.coursesBookmarked,
        pivotEntity: () => MapBookmarkerCourse,
        joinColumn: "course_id",
        inverseJoinColumn: "bookmarker_id"
    })
    bookmarkers!: Profile;

    [OptionalProps]?: "description" | "image" | "isPublic" | "addedOn" | "level" | "bookmarkers" | "avgPastViewersCountPerLesson";


    @Formula((alias: string) => `(SELECT COUNT(DISTINCT map_past_viewer_lesson.past_viewer_id)::float / GREATEST(COUNT(DISTINCT lesson.id), 1) FROM course LEFT JOIN lesson on course.id = lesson.course_id LEFT JOIN map_past_viewer_lesson on map_past_viewer_lesson.lesson_id = lesson.id WHERE course.id = ${alias}.id)`, {
        type: "number"
    })
    avgPastViewersCountPerLesson?: number;

    //annotated properties
    @Property({persist: false, type: types.json})
    vocabsByLevel?: Record<VocabLevel, number>;

    @Property({persist: false, type: types.boolean})
    isBookmarked?: boolean;
}
