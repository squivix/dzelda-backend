import {Collection, Entity, Enum, Index, ManyToOne, OneToMany, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {VocabLevel} from "@/src/models/enums/VocabLevel.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";

@Entity({customRepository: () => CourseRepo})
@Index({properties: ['language']})
@Index({properties: ['addedBy']})
export class Course extends CustomBaseEntity {
    constructor({title, language, addedBy, description, image, isPublic, level}:
                    { addedBy: Profile; language: Language; title: string; description?: string; image?: string; isPublic?: boolean; level?: LanguageLevel }) {
        super();
        this.title = title;
        this.language = language;
        this.addedBy = addedBy;
        if (description !== undefined)
            this.description = description;
        if (image !== undefined)
            this.image = image;
        if (isPublic !== undefined)
            this.isPublic = isPublic;
        if (level !== undefined)
            this.level = level;
    }

    @Property({type: types.string, length: 255})
    title!: string;

    @Property({type: types.string, length: 500, default: ""})
    description!: string;

    @ManyToOne({entity: () => Language, inversedBy: (language) => language.courses})
    language!: Language;

    @Property({type: types.string, length: 500, default: ""})
    image!: string;

    @Property({type: types.boolean, default: true})
    isPublic!: boolean;

    @ManyToOne({entity: () => Profile, inversedBy: (profile) => profile.coursesAdded})
    addedBy!: Profile;

    @Enum({items: () => LanguageLevel, type: types.enum, default: LanguageLevel.ADVANCED_1})
    level!: LanguageLevel;

    @OneToMany({entity: () => Lesson, mappedBy: (lesson) => lesson.course})
    lessons: Collection<Lesson> = new Collection<Lesson>(this);

    //annotated properties
    @Property({persist: false, type: types.json})
    vocabsByLevel?: Record<VocabLevel, number>;
}