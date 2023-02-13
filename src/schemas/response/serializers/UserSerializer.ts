import {CustomEntitySerializer} from "@/src/schemas/response/serializers/CustomEntitySerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {UserSchema} from "@/src/schemas/response/interfaces/UserSchema.js";
import {profileSerializer} from "@/src/schemas/response/serializers/ProfileSerializer.js";


class UserSerializer extends CustomEntitySerializer<User, UserSchema> {
    definition(user: User) {
        return {
            username: () => user.username,
            email: () => user.email,
            profile: () => profileSerializer.serialize(user.profile),
        };
    }
}

export const userSerializer = new UserSerializer();
