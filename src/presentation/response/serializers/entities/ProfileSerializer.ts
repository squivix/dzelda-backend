import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {LanguageSchema, ProfileSchema} from "dzelda-types";
import {languageSerializer} from "@/src/presentation/response/serializers/entities/LanguageSerializer.js";


class ProfileSerializer extends CustomEntitySerializer<Profile, ProfileSchema> {

    definition(profile: Profile): CustomCallbackObject<Partial<ProfileSchema>> {
        return {
            id: () => profile.id,
            languagesLearning: () => languageSerializer.serializeList(profile.languagesLearning.getItems()) as LanguageSchema[],
            profilePicture: () => profile.profilePicture,
            bio: () => profile.bio,
            isPublic: () => profile.isPublic
        };
    }

}

export const profileSerializer = new ProfileSerializer();
