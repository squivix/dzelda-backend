import {Factory, Faker} from "@mikro-orm/seeder";
import {EntityData} from "@mikro-orm/core";
import {Profile} from "@/src/models/entities/Profile.js";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";

export class ProfileFactory extends CustomFactory<Profile> {
    readonly model = Profile;

    protected definition(faker: Faker): EntityData<Profile> {
        return {
            profilePicture: faker.image.image(100, 100, true),
            bio: faker.random.words(faker.datatype.number({min: 5, max: 20})),
            isPublic: faker.datatype.boolean(),
        };
    }
}