import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {User} from "@/src/models/entities/auth/User.js";

class UserSignUpSerializer extends CustomSerializer<User> {
    serialize(user: User, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            username: user.username,
            email: `${user.email.charAt(0)}${"*".repeat(10)}@${"*".repeat(8)}`,
            isEmailConfirmed: user.isEmailConfirmed,
            isBanned: user.isBanned,
            isPendingEmailChange: user.isPendingEmailChange
        }, assertNoUndefined);
    }
}

export const userSignUpSerializer = new UserSignUpSerializer();
