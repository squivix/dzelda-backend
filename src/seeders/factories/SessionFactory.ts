import {Factory, Faker} from "@mikro-orm/seeder";
import {EntityData} from "@mikro-orm/core";
import {Session} from "@/src/models/entities/auth/Session.js";
import crypto from "crypto";

export class SessionFactory extends Factory<Session> {
    readonly model = Session;

    protected definition(faker: Faker): EntityData<Session> {
        return {
            token: crypto.randomBytes(Number(process.env.AUTH_TOKEN_LENGTH)).toString("hex")
        };
    }
}