import {CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {ProfileSchema} from "@/src/presentation/response/interfaces/entities/ProfileSchema.js";
import {languageSerializer} from "@/src/presentation/response/serializers/entities/LanguageSerializer.js";


class ProfileSerializer extends CustomEntitySerializer<Profile, ProfileSchema> {

    definition(profile: Profile) {
        return {
            id: () => profile.id,
            languagesLearning: () => languageSerializer.serializeList(profile.languagesLearning.getItems()),
            profilePicture: () => profile.profilePicture,
            bio: () => profile.bio,
            isPublic: () => profile.isPublic
        };
    }

}

export const profileSerializer = new ProfileSerializer();
