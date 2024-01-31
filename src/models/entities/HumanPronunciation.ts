import {Entity, ManyToOne, Property, types} from "@mikro-orm/core";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Vocab} from "@/src/models/entities/Vocab.js";

@Entity()
export class HumanPronunciation extends CustomBaseEntity {
    @Property({type: types.string, length: 500})
    url: string = "";

    @Property({type: types.string, nullable: true, default: null})
    accent!: string;

    @Property({type: types.string})
    source!: string;

    @Property({type: types.string, nullable: true, default: null})
    attributionLogo!: string;

    @Property({type: types.string})
    attributionMarkdownText!: string;

    @ManyToOne({entity: () => Vocab, onDelete: "cascade", onUpdateIntegrity: "cascade"})
    vocab!: Vocab;
}
