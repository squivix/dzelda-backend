import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {User} from "@/src/models/entities/auth/User.js";
import {profileDTO} from "@/src/presentation/response/dtos/Profile/ProfileDTO.js";

class UserPrivateDTO extends CustomDTO<User> {
    serialize(user: User): any {
        return {
            username: user.username,
            email: `${user.email.charAt(0)}${"*".repeat(10)}@${"*".repeat(8)}`,
            profile: profileDTO.serialize(user.profile),
            isEmailConfirmed: user.isEmailConfirmed,
            isBanned: user.isBanned,
            isPendingEmailChange: user.isPendingEmailChange
        }
    }
}

export const userPrivateDTO = new UserPrivateDTO();