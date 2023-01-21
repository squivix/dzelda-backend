import {CustomEntitySerializer, SerializationMode} from "@/src/schemas/serializers/EntitySerializer.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {ProfileDetailsSchema} from "@/src/schemas/interfaces/ProfileDetailsSchema.js";
import {languageSerializer} from "@/src/schemas/serializers/LanguageSerializer.js";


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