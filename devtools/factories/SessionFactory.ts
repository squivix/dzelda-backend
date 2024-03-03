import {EntityData} from "@mikro-orm/core";
import {Session} from "@/src/models/entities/auth/Session.js";
import crypto from "crypto";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {AUTH_TOKEN_LENGTH} from "@/src/constants.js";

export class SessionFactory extends CustomFactory<Session> {
    readonly model = Session;

    protected definition(): EntityData<Session> {
        return {
            token: crypto.randomBytes(AUTH_TOKEN_LENGTH).toString("hex")
        };
    }
}
