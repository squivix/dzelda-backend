import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {textSummaryLoggedInSerializer} from "@/src/presentation/response/serializers/Text/TextSummaryLoggedInSerializer.js";

class CollectionLoggedInSerializer extends CustomSerializer<Collection> {
    serialize(collection: Collection): any {
        return {
            id: collection.id,
            title: collection.title,
            description: collection.description,
            image: collection.image,
            language: collection.language.code,
            addedOn: collection.addedOn.toISOString(),
            addedBy: collection.addedBy.user.username,
            isPublic: collection.isPublic,
            texts: textSummaryLoggedInSerializer.serializeList(collection.texts.getItems()),

            vocabsByLevel: collection.vocabsByLevel,
            isBookmarked: collection.isBookmarked,
        };
    }
}

export const collectionLoggedInSerializer = new CollectionLoggedInSerializer();