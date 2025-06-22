import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {profileSerializer} from "@/src/presentation/response/serializers/Profile/ProfileSerializer.js";

class UserPrivateSerializer extends CustomSerializer<User> {
    serialize(user: User): any {
        return {
            username: user.username,
            email: `${user.email.charAt(0)}${"*".repeat(10)}@${"*".repeat(8)}`,
            profile: profileSerializer.serialize(user.profile),
            isEmailConfirmed: user.isEmailConfirmed,
            isBanned: user.isBanned,
            isPendingEmailChange: user.isPendingEmailChange
        };
    }
}

export const userPrivateSerializer = new UserPrivateSerializer();