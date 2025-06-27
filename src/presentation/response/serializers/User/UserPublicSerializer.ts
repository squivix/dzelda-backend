import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {profileSerializer} from "@/src/presentation/response/serializers/Profile/ProfileSerializer.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class UserPublicSerializer extends CustomSerializer<User> {
    serialize(user: User, {assertNoUndefined = true} = {}): any {
        const pojo = {
            username: user.username,
            profile: profileSerializer.serialize(user.profile, {assertNoUndefined}),
            isBanned: user.isBanned,
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const userPublicSerializer = new UserPublicSerializer();