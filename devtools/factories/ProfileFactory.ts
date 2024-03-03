import {EntityData} from "@mikro-orm/core";
import {Profile} from "@/src/models/entities/Profile.js";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {faker} from "@faker-js/faker";

export class ProfileFactory extends CustomFactory<Profile> {
    readonly model = Profile;

    protected definition(): EntityData<Profile> {
        return {
            profilePicture: faker.image.image(100, 100, true),
            bio: faker.random.words(faker.datatype.number({min: 5, max: 20})),
            isPublic: faker.datatype.boolean(),
        };
    }
}
