import {Entity, ManyToMany, ManyToOne, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Profile} from "@/src/models/entities/Profile.js";

@Entity()
export class Dictionary extends CustomBaseEntity {
    @ManyToOne({entity: () => Language, inversedBy: (language) => language.dictionaries})
    language!: Language;

    @Property({type: types.string, length: 255})
    name!: string;

    @Property({type: types.string, length: 500})
    link!: string;

    @Property({type: types.boolean, default: false})
    isDefault!: boolean;

    @ManyToMany({entity: () => Profile, inversedBy: (user: Profile) => user.dictionariesSaved})
    learners!: Profile;
}