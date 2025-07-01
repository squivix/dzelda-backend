import {User} from "@/src/models/entities/auth/User.js";
import {profileSerializer} from "@/src/presentation/response/serializers/Profile/ProfileSerializer.js";
import {userFetchSpecs, UserFetchSpecsType} from "@/src/models/fetchSpecs/userFetchSpecs.js";
import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";

type UserSpec = ReturnType<typeof userFetchSpecs>;


class UserPrivateSerializer extends CustomSerializer<User> {

    readonly view: ViewDescriptionFromSpec<User, UserFetchSpecsType> = {
        fields: ["username", "email", "isEmailConfirmed", "isBanned", "isPendingEmailChange"],
        relations: {
            profile: profileSerializer.view
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
