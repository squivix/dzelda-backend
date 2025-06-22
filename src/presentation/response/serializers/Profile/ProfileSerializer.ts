import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {languageSerializer} from "@/src/presentation/response/serializers/Language/LanguageSerializer.js";

class ProfileSerializer extends CustomSerializer<Profile> {
    serialize(profile: Profile): any {
        return {
            id: profile.id,
            languagesLearning: languageSerializer.serializeList(profile.languagesLearning.getItems()),
            profilePicture: profile.profilePicture,
            bio: profile.bio,
            isPublic: profile.isPublic
        };
    }
}

export const profileSerializer = new ProfileSerializer();