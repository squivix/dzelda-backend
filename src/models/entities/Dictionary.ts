import {Entity, Index, ManyToMany, ManyToOne, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";

@Entity()
@Index({properties: ['language']})
export class Dictionary extends CustomBaseEntity {
    @ManyToOne({entity: () => Language, inversedBy: (language) => language.dictionaries})
    language!: Language;

    @Property({type: types.string, length: 255})
    name!: string;

    @Property({type: types.string, length: 500})
    lookupLink!: string;

    @Property({type: types.string, length: 500})
    dictionaryLink!: string;

    @Property({type: types.boolean, default: false})
    isDefault!: boolean;

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (user: Profile) => user.dictionariesSaved,
        pivotEntity: () => MapLearnerDictionary,
        joinColumn: "dictionary_id",
        inverseJoinColumn: "learner_id"
    })
    learners!: Profile;
}