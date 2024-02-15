import {Faker} from "@mikro-orm/seeder";
import {EntityData, EntityManager} from "@mikro-orm/core";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {UserFactory} from "@/devtools/factories/UserFactory.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {Lesson} from "@/src/models/entities/Lesson.js";

export class CollectionFactory extends CustomFactory<Collection> {
    readonly model = Collection;

    protected definition(faker: Faker): EntityData<Collection> {
        const em = (this as any).em as EntityManager;
        const userFactory = new UserFactory(em);
        const profileFactory = new ProfileFactory(em);
        return {
            title: faker.random.words(faker.datatype.number({min: 5, max: 20})),
            description: faker.random.words(faker.datatype.number({min: 20, max: 30})),
            image: faker.image.imageUrl(100, 100),
            addedOn: new Date(Math.round(Date.now() / 1000) * 1000), // now rounded to nearest second because db column is timestampz(0)
            addedBy: profileFactory.makeDefinition({user: userFactory.makeDefinition({}, ["profile"])}),
            lessons: []
        };
    }

    override makeDefinition(overrideParameters?: EntityData<Collection>): EntityData<Collection> {
        if (Array.isArray(overrideParameters?.lessons))
            (overrideParameters!.lessons as EntityData<Lesson>[]).forEach((l, i) => l.orderInCollection = i + 1);
        return super.makeDefinition(overrideParameters);
    }
}
