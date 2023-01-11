import {Faker} from "@mikro-orm/seeder";
import {User} from "@/src/models/entities/auth/User.js";
import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";

export class UserFactory extends CustomFactory<User> {
    readonly model = User;

    async createOne(overrideParameters?: EntityData<User>): Promise<User> {
        return await super.createOne(overrideParameters);
    }

    protected definition(faker: Faker): EntityData<User> {
        return {
            username: faker.random.alpha({count: 20}),
            email: faker.internet.email(),
            password: faker.random.alphaNumeric(128),    // password not hashed because hashing is async
            profile: {
                profilePicture: faker.image.image(100, 100, true),
                bio: faker.random.words(faker.datatype.number({min: 5, max: 20})),
                isPublic: faker.datatype.boolean(),
            }
        };
    }
}