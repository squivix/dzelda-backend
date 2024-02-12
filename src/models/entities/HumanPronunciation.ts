import {Entity, Index, ManyToOne, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Attribution} from "@/src/models/interfaces/Attribution.js";

@Entity()
@Index({properties: ["parsedText"]})
export class HumanPronunciation extends CustomBaseEntity {
    @Property({type: types.string, length: 500})
    url: string = "";

    @Property({type: types.string})
    text!: string;

    @Property({type: types.string})
    parsedText!: string;

    @ManyToOne({entity: () => Language, inversedBy: (language: Language) => language.humanPronunciations, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    language!: Language;

    @Property({type: types.string, nullable: true, default: null})
    speakerCountryCode!: string | null;

    @Property({type: types.string, nullable: true, default: null})
    speakerRegion!: string | null;

    @Property({type: types.json, nullable: true})
    attribution!: Attribution;
}
