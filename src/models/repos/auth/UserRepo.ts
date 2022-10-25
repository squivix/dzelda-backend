import {EntityRepository} from "@mikro-orm/core";
import {User} from "../../entities/auth/User";

export default class UserRepo extends EntityRepository<User> {

}