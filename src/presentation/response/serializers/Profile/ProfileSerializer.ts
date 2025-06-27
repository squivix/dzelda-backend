import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {LanguageSerializer, languageSerializer} from "@/src/presentation/response/serializers/Language/LanguageSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

export class ProfileSerializer extends CustomSerializer<Profile> {
    static readonly view: ViewDescription = {
        fields: ["id", "profilePicture", "bio", "isPublic"],
        relations: {
            languagesLearning: LanguageSerializer.view
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
