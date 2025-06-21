import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {languageDTO} from "@/src/presentation/response/dtos/Language/LanguageDTO.js";

class ProfileDTO extends CustomDTO<Profile> {
    serialize(profile: Profile): any {
        return {
            id: profile.id,
            languagesLearning: languageDTO.serializeList(profile.languagesLearning.getItems()),
            profilePicture: profile.profilePicture,
            bio: profile.bio,
            isPublic: profile.isPublic
        }
    }
}

export const profileDTO = new ProfileDTO();