import {Collection as MikroORMCollection, Entity, OneToMany, Property, types} from "@mikro-orm/core";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {PreferredTranslationLanguageEntry} from "@/src/models/entities/PreferredTranslationLanguageEntry.js";

@Entity()
export class TranslationLanguage extends CustomBaseEntity {
    @Property({type: types.string, unique: true})
    code!: string;

    @Property({type: types.string, length: 255})
    name!: string;

    @Property({type: types.boolean, default: false})
    isDefault: boolean = false;

    @OneToMany({entity: () => Meaning, mappedBy: (meaning) => meaning.language, hidden: true})
    meaningsSavedIn: MikroORMCollection<Meaning> = new MikroORMCollection<Meaning>(this);

    @OneToMany({
        entity: () => PreferredTranslationLanguageEntry,
        mappedBy: (preferredTranslationLanguageEntry) => preferredTranslationLanguageEntry.translationLanguage,
        orderBy: {precedenceOrder: "asc"}
    })
    prefererEntries: MikroORMCollection<PreferredTranslationLanguageEntry> = new MikroORMCollection<PreferredTranslationLanguageEntry>(this);
}
