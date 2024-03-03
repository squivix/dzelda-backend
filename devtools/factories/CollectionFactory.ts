import {EntityData, EntityManager} from "@mikro-orm/core";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {UserFactory} from "@/devtools/factories/UserFactory.js";
import {Text} from "@/src/models/entities/Text.js";
import {faker} from "@faker-js/faker";

export class CollectionFactory extends CustomFactory<Collection> {
    readonly model = Collection;

    protected definition(): EntityData<Collection> {
        const em = (this as any).em as EntityManager;
        const userFactory = new UserFactory(em);
        const profileFactory = new ProfileFactory(em);
        return {
            title: faker.random.words(faker.datatype.number({min: 5, max: 20})),
            description: faker.random.words(faker.datatype.number({min: 20, max: 30})),
            image: faker.image.imageUrl(100, 100),
            addedOn: new Date(Math.round(Date.now() / 1000) * 1000), // now rounded to nearest second because db column is timestampz(0)
            addedBy: profileFactory.makeDefinition({user: userFactory.makeDefinition({}, ["profile"])}),
            texts: []
        };
    }

    override makeDefinition(overrideParameters?: EntityData<Collection>): EntityData<Collection> {
        if (Array.isArray(overrideParameters?.texts))
            (overrideParameters!.texts as EntityData<Text>[]).forEach((l, i) => l.orderInCollection = i + 1);
        return super.makeDefinition(overrideParameters);
    }
}
