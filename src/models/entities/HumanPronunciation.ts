import {Entity, Index, ManyToOne, OptionalProps, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Language} from "@/src/models/entities/Language.js";
import {Attribution} from "@/src/models/interfaces/Attribution.js";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";

@Entity()
@Index({properties: ["parsedText"]})
@Index({properties: ["language"]})
@Index({properties: ["attributionSource"]})
export class HumanPronunciation extends CustomBaseEntity {
    @Property({type: types.string, length: 500})
    url: string = "";

    @Property({type: types.string, length: 512})
    text!: string;

    @Property({type: types.string, length: 512})
    parsedText!: string;

    @ManyToOne({entity: () => Language, inversedBy: (language: Language) => language.humanPronunciations, deleteRule: "cascade", updateRule: "cascade"})
    language!: Language;

    @Property({type: types.string, nullable: true, default: null})
    speakerCountryCode!: string | null;

    @Property({type: types.string, nullable: true, default: null})
    speakerRegion!: string | null;

    @ManyToOne({entity: () => AttributionSource, nullable: true, deleteRule: "set null", updateRule: "cascade", eager: true})
    attributionSource?: AttributionSource;

    @Property({type: types.json, nullable: true})
    attribution!: Attribution;

    [OptionalProps]?: "attribution";
}
