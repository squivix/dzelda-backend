import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {ProfileSerializer, profileSerializer} from "@/src/presentation/response/serializers/Profile/ProfileSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class UserPublicSerializer extends CustomSerializer<User> {
    static readonly view: ViewDescription = {
        fields: ["username", "isBanned"],
        relations: {
            profile: ProfileSerializer.view
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
