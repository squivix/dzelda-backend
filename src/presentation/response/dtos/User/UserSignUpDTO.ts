import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {User} from "@/src/models/entities/auth/User.js";

class UserSignUpDTO extends CustomDTO<User> {
    serialize(user: User): any {
        return {
            username: user.username,
            email: `${user.email.charAt(0)}${"*".repeat(10)}@${"*".repeat(8)}`,
            isEmailConfirmed: user.isEmailConfirmed,
            isBanned: user.isBanned,
            isPendingEmailChange: user.isPendingEmailChange
        }
    }
}

export const userSignUpDTO = new UserSignUpDTO();