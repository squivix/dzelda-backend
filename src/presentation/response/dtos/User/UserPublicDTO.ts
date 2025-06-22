import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {User} from "@/src/models/entities/auth/User.js";
import {profileDTO} from "@/src/presentation/response/dtos/Profile/ProfileDTO.js";

class UserPublicDTO extends CustomDTO<User> {
    serialize(user: User): any {
        return {
            username: user.username,
            profile: profileDTO.serialize(user.profile),
            isBanned: user.isBanned,
        };
    }
}

export const userPublicDTO = new UserPublicDTO();