import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {ProfileSchema, UserSchema} from "dzelda-types";
import {profileSerializer} from "@/src/presentation/response/serializers/entities/ProfileSerializer.js";


class UserSerializer extends CustomEntitySerializer<User, UserSchema> {
    definition(user: User): CustomCallbackObject<UserSchema> {
        return {
            username: () => user.username,
            email: () => user.email,
            profile: () => profileSerializer.serialize(user.profile) as ProfileSchema,
        };
    }
}

export const userSerializer = new UserSerializer();
