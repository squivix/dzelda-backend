import {Faker} from "@mikro-orm/seeder";
import {User} from "@/src/models/entities/auth/User.js";
import {EntityData, EntityManager} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";

export class UserFactory extends CustomFactory<User> {

    readonly model = User;

    protected definition(faker: Faker): EntityData<User> {
        const em = (this as any).em as EntityManager;
        const profileFactory = new ProfileFactory(em);
        return {
            username: faker.random.alpha({count: 20}),
            email: `${faker.random.alpha({count: 10})}_${faker.internet.email()}`,
            password: faker.random.alphaNumeric(128),    // password not hashed because hashing is async
            profile: profileFactory.makeDefinition(),
            isEmailConfirmed: true
        };
    }
}
