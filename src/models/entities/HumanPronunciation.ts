import {Entity, ManyToOne, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Language} from "@/src/models/entities/Language.js";

@Entity()
export class HumanPronunciation extends CustomBaseEntity {
    @Property({type: types.string, length: 500})
    url: string = "";

    @Property({type: types.string})
    text!: string;

    @ManyToOne({entity: () => Language, inversedBy: (language: Language) => language.humanPronunciations, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    language!: Language;

    @Property({type: types.string, nullable: true, default: null})
    accent!: string;

    @Property({type: types.string})
    source!: string;

    @Property({type: types.string, nullable: true, default: null})
    attributionLogo!: string;

    @Property({type: types.string})
    attributionMarkdownText!: string;

}
