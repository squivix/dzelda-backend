import {Session} from "../../entities/auth/Session.js";
import {EntityRepository} from "@mikro-orm/core";

export class SessionRepo extends EntityRepository<Session> {

}