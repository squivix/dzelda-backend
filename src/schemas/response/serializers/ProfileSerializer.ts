import {CustomEntitySerializer} from "@/src/schemas/response/serializers/CustomEntitySerializer.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {ProfileDetailsSchema} from "@/src/schemas/response/interfaces/ProfileDetailsSchema.js";
import {languageSerializer} from "@/src/schemas/response/serializers/LanguageSerializer.js";
import {LanguageListSchema} from "@/src/schemas/response/interfaces/LanguageListSchema.js";
import {SerializationMode} from "@/src/schemas/response/serializers/ListDetailSerializer.js";


class ProfileSerializer extends CustomEntitySerializer<Profile, ProfileDetailsSchema> {
    serialize(profile: Profile, {
        mode,
        ignore
    }: { mode?: SerializationMode; ignore?: (keyof ProfileDetailsSchema)[] } = {}): ProfileDetailsSchema {
        return {
            id: profile.id,
            languagesLearning: languageSerializer.serializeList(profile.languagesLearning.getItems()) as LanguageListSchema[],
            profilePicture: profile.profilePicture,
            bio: profile.bio,
            isPublic: profile.isPublic
        }
    }
}

export const profileSerializer = new ProfileSerializer()
