import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {ProfileSchema, UserSchema} from "dzelda-types";
import {profileSerializer} from "@/src/presentation/response/serializers/entities/ProfileSerializer.js";


class UserSerializer extends CustomEntitySerializer<User, UserSchema> {
    definition(user: User): CustomCallbackObject<UserSchema> {
        return {
            username: () => user.username,
            email: () => `${user.email.charAt(0)}${"*".repeat(10)}@${"*".repeat(8)}`,
            profile: () => user.profile ? profileSerializer.serialize(user.profile) as ProfileSchema : null,
            isEmailConfirmed: () => user.isEmailConfirmed
        };
    }
}

export const userSerializer = new UserSerializer();
