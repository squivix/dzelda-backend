import {Collection, Entity, ManyToOne, OneToMany, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {Profile} from "@/src/models/entities/Profile.js";

@Entity({tableName: "tts_voice"})
export class TTSVoice extends CustomBaseEntity {
    @Property({type: types.string})
    code!: string;

    @Property({type: types.string})
    name!: string;

    @Property({type: types.string})
    gender!: string;

    @Property({type: types.string})
    provider!: string;

    @Property({type: types.string})
    accent!: string;

    @Property({type: types.boolean, default: false})
    isDefault!: boolean;

    @ManyToOne({entity: () => Language, inversedBy: (language: Language) => language.ttsVoices, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    language!: Language;

    @OneToMany({entity: () => MapLearnerLanguage, mappedBy: (prefererLanguageMapping: MapLearnerLanguage) => prefererLanguageMapping.preferredTtsVoice, hidden: true})
    prefererLanguageMappings: Collection<MapLearnerLanguage> = new Collection<MapLearnerLanguage>(this);
}
