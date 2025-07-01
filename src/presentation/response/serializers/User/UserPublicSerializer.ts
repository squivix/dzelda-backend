import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {profileSerializer} from "@/src/presentation/response/serializers/Profile/ProfileSerializer.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {UserFetchSpecsType} from "@/src/models/fetchSpecs/userFetchSpecs.js";

class UserPublicSerializer extends CustomSerializer<User> {
    readonly view: ViewDescriptionFromSpec<User, UserFetchSpecsType> = {
        fields: ["username", "isBanned"],
        relations: {
            profile: profileSerializer.view
        }
    }

    serialize(user: User, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            username: user.username,
            isBanned: user.isBanned,

            profile: profileSerializer.serialize(user.profile, {assertNoUndefined}),
        }, assertNoUndefined);
    }
}

export const userPublicSerializer = new UserPublicSerializer();
