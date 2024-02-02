import {Entity, Index, ManyToMany, ManyToOne, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";

@Entity()
@Index({properties: ["language"]})
@Index({properties: ["name"]})
export class Dictionary extends CustomBaseEntity {
    @ManyToOne({entity: () => Language, inversedBy: (language) => language.dictionaries, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    language!: Language;

    @Property({type: types.string, length: 255})
    name!: string;

    @Property({type: types.string, length: 500})
    lookupLink!: string;

    @Property({type: types.string, length: 500})
    dictionaryLink!: string;

    @Property({type: types.boolean, default: false})
    isDefault: boolean = false;

    @Property({type: types.boolean, default: false})
    isPronunciation: boolean = false;

    @ManyToMany({
        entity: () => Profile,
        inversedBy: (user: Profile) => user.dictionariesSaved,
        pivotEntity: () => MapLearnerDictionary,
        joinColumn: "dictionary_id",
        inverseJoinColumn: "learner_id"
    })
    learners!: Profile;
}
