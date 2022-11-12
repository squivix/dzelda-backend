import {Factory, Faker} from "@mikro-orm/seeder";
import {EntityData} from "@mikro-orm/core";
import {Profile} from "../../models/entities/Profile.js";

export class ProfileFactory extends Factory<Profile> {
    readonly model = Profile;

    protected definition(faker: Faker): EntityData<Profile> {
        return {
        profilePicture: faker.image.image(100,100,true),
        bio:  faker.random.words(faker.datatype.number({min:5,max:20})),
        isPublic:  faker.datatype.boolean(),
    };
    }
}