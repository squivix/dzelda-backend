import {CustomEntitySerializer, SerializationMode} from "@/src/schemas/response/serializers/EntitySerializer.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {ProfileDetailsSchema} from "@/src/schemas/response/interfaces/ProfileDetailsSchema.js";
import {languageSerializer} from "@/src/schemas/response/serializers/LanguageSerializer.js";


class ProfileSerializer extends CustomEntitySerializer<Profile, ProfileDetailsSchema> {
    serialize(profile: Profile, {
        mode,
        hiddenFields
    }: { mode?: SerializationMode; hiddenFields?: (keyof ProfileDetailsSchema)[] } = {}): ProfileDetailsSchema {
        return {
            id: profile.id,
            languagesLearning: languageSerializer.serializeList(profile.languagesLearning.getItems()),
            /** Format: uri */
            profilePicture: profile.profilePicture,
            bio: profile.bio,
            isPublic: profile.isPublic
        }
    }
}

export const profileSerializer = new ProfileSerializer()
