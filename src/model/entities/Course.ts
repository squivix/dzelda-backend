import {Entity, Enum, ManyToOne, OneToMany, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Language} from "./Language.js";
import {Profile} from "./Profile.js";
import {LanguageLevel} from "../enums/LanguageLevel.js";
import {Lesson} from "./Lesson.js";

@Entity()
export class Course extends CustomBaseEntity {
    @Property({type: types.string, length: 255})
    title!: string;

    @Property({type: types.string, length: 500})
    description!: string;

    @ManyToOne({entity: () => Language, inversedBy: (language) => language.courses})
    language!: Language;

    @Property({type: types.string, length: 500, nullable: true, default: null})
    image!: string;

    @Property({type: types.boolean, default: true})
    isPublic!: boolean;

    @ManyToOne({entity: () => Profile, inversedBy: (profile) => profile.coursesAdded})
    addedBy!: Profile;

    @Enum({items: () => LanguageLevel, type: types.enum})
    level!: LanguageLevel;

    @OneToMany({entity: () => Lesson, mappedBy: (lesson) => lesson.course})
    lessons!: Lesson;
}