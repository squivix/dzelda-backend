import {User} from "@/src/models/entities/auth/User.js";
import {EntityData, EntityManager} from "@mikro-orm/core";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {faker} from "@faker-js/faker";

export class UserFactory extends CustomFactory<User> {

    readonly model = User;

    protected definition(): EntityData<User> {
        const em = (this as any).em as EntityManager;
        const profileFactory = new ProfileFactory(em);
        // emailEncrypter.encrypt
        return {
            username: faker.random.alpha({count: 20}),
            email: `${faker.random.alpha({count: 10})}_${faker.internet.email()}`,
            password: faker.random.alphaNumeric(128),    // password not hashed because hashing is async
            profile: profileFactory.makeDefinition(),
            isEmailConfirmed: true,
            isPendingEmailChange: false
        };
    }
}
