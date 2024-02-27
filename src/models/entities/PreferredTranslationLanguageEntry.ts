import {Entity, Index, ManyToOne, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Language} from "@/src/models/entities/Language.js";

@Entity()
@Unique({properties: ["translationLanguage", "learnerLanguageMapping"]})
@Index({properties: ["translationLanguage"]})
@Index({properties: ["learnerLanguageMapping"]})
export class PreferredTranslationLanguageEntry extends CustomBaseEntity {
    @ManyToOne({entity: () => TranslationLanguage, deleteRule: "cascade", updateRule: "cascade"})
    translationLanguage!: TranslationLanguage;

    @ManyToOne({entity: () => MapLearnerLanguage, deleteRule: "cascade", updateRule: "cascade"})
    learnerLanguageMapping!: MapLearnerLanguage;

    @Property({type: types.integer})
    precedenceOrder!: number;
}
