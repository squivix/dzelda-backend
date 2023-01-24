import {Faker} from "@mikro-orm/seeder";
import {User} from "@/src/models/entities/auth/User.js";
import {EntityData, EntityManager} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";

export class UserFactory extends CustomFactory<User> {

    readonly model = User;

    async createOne(overrideParameters?: EntityData<User>): Promise<User> {
        return await super.createOne(overrideParameters);
    }


    public static makeDefinition(faker: Faker): EntityData<User> {
        return {
            username: faker.random.alpha({count: 20}),
            email: faker.internet.email(),
            password: faker.random.alphaNumeric(128),    // password not hashed because hashing is async
            profile: ProfileFactory.makeDefinition(faker)
        };
    }

    protected definition(faker: Faker): EntityData<User> {
        return UserFactory.makeDefinition(faker);
    }
}