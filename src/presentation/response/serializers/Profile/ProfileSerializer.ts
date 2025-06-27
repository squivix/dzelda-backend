import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {languageSerializer} from "@/src/presentation/response/serializers/Language/LanguageSerializer.js";

class ProfileSerializer extends CustomSerializer<Profile> {
    serialize(profile: Profile, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: profile.id,
            languagesLearning: languageSerializer.serializeList(profile.languagesLearning.getItems(), {assertNoUndefined}),
            profilePicture: profile.profilePicture,
            bio: profile.bio,
            isPublic: profile.isPublic
        }, assertNoUndefined);
    }
}

export const profileSerializer = new ProfileSerializer();
