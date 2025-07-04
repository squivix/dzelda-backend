import {Collection, Entity, Enum, Index, ManyToOne, OneToMany, Property, types, Unique} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {TTSProvider} from "dzelda-common";

@Entity({tableName: "tts_voice"})
@Unique({properties: ["language", "code"]})
@Index({properties: ["language"]})
export class TTSVoice extends CustomBaseEntity {
    @Property({type: types.string})
    code!: string;

    @Property({type: types.string})
    name!: string;

    @Property({type: types.string})
    gender!: string;

    @Enum({type: types.enum, items: () => TTSProvider})
    provider!: TTSProvider;

    @Property({type: types.string})
    accentCountryCode!: string;

    @Property({type: types.boolean, default: false})
    isDefault!: boolean;

    @ManyToOne({entity: () => Language, inversedBy: (language: Language) => language.ttsVoices, deleteRule: "cascade", updateRule: "cascade"})
    language!: Language;

    @OneToMany({entity: () => MapLearnerLanguage, mappedBy: (prefererLanguageMapping: MapLearnerLanguage) => prefererLanguageMapping.preferredTtsVoice, hidden: true})
    prefererLanguageMappings: Collection<MapLearnerLanguage> = new Collection<MapLearnerLanguage>(this);

    @Property({type: types.json, nullable: true})
    synthesizeParams!: Record<string, any> | null;
}
