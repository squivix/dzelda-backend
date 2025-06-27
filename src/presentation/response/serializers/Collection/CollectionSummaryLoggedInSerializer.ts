import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class CollectionSummaryLoggedInSerializer extends CustomSerializer<Collection> {
    static readonly view: ViewDescription = {
        fields: ["id", "title", "description", "image", "addedOn", "isPublic", "avgPastViewersCountPerText", "vocabsByLevel", "isBookmarked"],
        relations: {
            language: {
                fields: ["code"],
            },
            addedBy: {
                fields: [],
                relations: {
                    user: {
                        fields: ["username"]
                    }
                }
            },
        }
    }

    serialize(collection: Collection, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: collection.id,
            title: collection.title,
            description: collection.description,
            image: collection.image,
            addedOn: collection.addedOn.toISOString(),
            isPublic: collection.isPublic,

            language: collection.language.code,
            addedBy: collection.addedBy.user.username,

            vocabsByLevel: collection.vocabsByLevel,
            isBookmarked: collection.isBookmarked,
        }, assertNoUndefined);
    }
}

export const collectionSummaryLoggedInSerializer = new CollectionSummaryLoggedInSerializer();
