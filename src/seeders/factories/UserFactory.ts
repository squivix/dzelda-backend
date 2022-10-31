import {Factory, Faker} from "@mikro-orm/seeder";
import {User} from "../../models/entities/auth/User.js";
import {EntityData} from "@mikro-orm/core";

export class UserFactory extends Factory<User> {
    readonly model = User;

    protected definition(faker: Faker): EntityData<User> {
        return {
            username: faker.random.alpha({count: 20}),
            email: faker.internet.email(),
            password: faker.random.alphaNumeric(128)
        };
    }

}