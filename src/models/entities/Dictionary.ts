import {CustomBaseEntity} from "./CustomBaseEntity.js";
import {Language} from "./Language.js";
import {Entity, ManyToMany, ManyToOne, Property, types} from "@mikro-orm/core";
import {Profile} from "./Profile.js";

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