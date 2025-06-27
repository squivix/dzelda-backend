import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {profileSerializer} from "@/src/presentation/response/serializers/Profile/ProfileSerializer.js";

class UserPublicSerializer extends CustomSerializer<User> {
    serialize(user: User, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            username: user.username,
            profile: profileSerializer.serialize(user.profile, {assertNoUndefined}),
            isBanned: user.isBanned,
        }, assertNoUndefined);
    }
}

export const userPublicSerializer = new UserPublicSerializer();
