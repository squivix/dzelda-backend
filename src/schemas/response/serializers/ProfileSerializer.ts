import {CustomEntitySerializer} from "@/src/schemas/response/serializers/CustomEntitySerializer.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {ProfileSchema} from "@/src/schemas/response/interfaces/ProfileSchema.js";
import {languageSerializer} from "@/src/schemas/response/serializers/LanguageSerializer.js";


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
