import {CustomEntitySerializer, SerializationMode} from "@/src/schemas/response/serializers/EntitySerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {UserSchema} from "@/src/schemas/response/interfaces/UserSchema.js";
import {profileSerializer} from "@/src/schemas/response/serializers/ProfileSerializer.js";


class UserSerializer extends CustomEntitySerializer<User, UserSchema> {
    serialize(user: User, {
        mode = SerializationMode.DETAIL,
        hiddenFields = []
    }: { mode?: SerializationMode; hiddenFields?: (keyof UserSchema)[] } = {}): UserSchema {
        const userPojo = {
            username: user.username,
            /** Format: email */
            email: user.email,
            profile: profileSerializer.serialize(user.profile),
        }
        for (const field of hiddenFields)
            delete userPojo[field];
        return userPojo;
    }
}

export const userSerializer = new UserSerializer()
