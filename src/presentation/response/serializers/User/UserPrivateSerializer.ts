import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {User} from "@/src/models/entities/auth/User.js";
import {profileSerializer} from "@/src/presentation/response/serializers/Profile/ProfileSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class UserPrivateSerializer extends CustomSerializer<User> {
    static readonly view: ViewDescription = {
        fields: ["username", "email", "isEmailConfirmed", "isBanned", "isPendingEmailChange"],
        relations: {
            profile: {
                fields: ["id", "profilePicture", "bio", "isPublic"],
                relations: {
                    languagesLearning: {
                        fields: ["id", "code", "name", "greeting", "isRtl", "flag", "flagCircular", "flagEmoji", "color", "levelThresholds", "learnersCount"]
                    }
                }
            }
        }
    }


    serialize(user: User, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            username: user.username,
            email: `${user.email.charAt(0)}${"*".repeat(10)}@${"*".repeat(8)}`,
            isEmailConfirmed: user.isEmailConfirmed,
            isBanned: user.isBanned,
            isPendingEmailChange: user.isPendingEmailChange,

            profile: profileSerializer.serialize(user.profile, {assertNoUndefined}),
        }, assertNoUndefined);
    }
}

export const userPrivateSerializer = new UserPrivateSerializer();
