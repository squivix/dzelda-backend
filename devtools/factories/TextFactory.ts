import {EntityData, EntityManager} from "@mikro-orm/core";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {Text} from "@/src/models/entities/Text.js";
import {LanguageLevel, parsers} from "dzelda-common";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {UserFactory} from "@/devtools/factories/UserFactory.js";
import {randomEnum} from "@/tests/utils.js";
import {faker} from "@faker-js/faker";

export class TextFactory extends CustomFactory<Text> {
    readonly model = Text;

    protected definition(): EntityData<Text> {
        const title = faker.random.words(faker.datatype.number({min: 4, max: 10}));
        const content = faker.random.words(faker.datatype.number({min: 50, max: 100}));
        const em = (this as any).em as EntityManager;
        const userFactory = new UserFactory(em);
        const profileFactory = new ProfileFactory(em);
        return {
            title: title,
            content: content,
            parsedTitle: parsers["en"].parseText(title),
            parsedContent: parsers["en"].parseText(content),
            isPublic: true,
            level: randomEnum(LanguageLevel),
            image: faker.image.imageUrl(100, 100),
            addedOn: new Date(Math.round(Date.now() / 1000) * 1000), // now rounded to nearest second because db column is timestampz(0)
            audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg",
            addedBy: profileFactory.makeDefinition({user: userFactory.makeDefinition({}, ["profile"])}),
            pastViewersCount: 0,
        };
    }

    override makeDefinition(overrideParameters?: EntityData<Text>): EntityData<Text> {
        if (overrideParameters?.pastViewers !== undefined && overrideParameters?.pastViewersCount === undefined)
            overrideParameters.pastViewersCount = Array.isArray(overrideParameters?.pastViewers) ? overrideParameters.pastViewers.length : 1;
        return super.makeDefinition(overrideParameters);
    }

    override makeDefinitions(amount: number, overrideParameters?: EntityData<Text>): EntityData<Text>[] {
        let overrideArray: EntityData<Text>[] = [...Array(amount)].map(_ => ({...overrideParameters}));
        if (overrideParameters?.orderInCollection === undefined)
            overrideArray = overrideArray.map((p, i) => ({...p, orderInCollection: i}));
        if (overrideParameters?.isLastInCollection === undefined)
            overrideArray = overrideArray.map((p, i) => ({...p, isLastInCollection: i == amount - 1}));
        return overrideArray.map((p) => this.makeDefinition(p));
    }
}
