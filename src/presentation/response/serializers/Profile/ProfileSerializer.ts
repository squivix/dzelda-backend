import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {languageSerializer} from "@/src/presentation/response/serializers/Language/LanguageSerializer.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {ProfileFetchSpecsType} from "@/src/models/fetchSpecs/profileFetchSpecs.js";

class ProfileSerializer extends CustomSerializer<Profile> {
    readonly view: ViewDescriptionFromSpec<Profile, ProfileFetchSpecsType> = {
        fields: ["id", "profilePicture", "bio", "isPublic"],
        relations: {
            languagesLearning: languageSerializer.view
        }
    }

    serialize(profile: Profile, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: profile.id,
            profilePicture: profile.profilePicture,
            bio: profile.bio,
            isPublic: profile.isPublic,

            languagesLearning: languageSerializer.serializeList(profile.languagesLearning.getItems(), {assertNoUndefined}),
        }, assertNoUndefined);
    }
}

export const profileSerializer = new ProfileSerializer();
