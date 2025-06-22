import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {textSummarySerializer} from "@/src/presentation/response/serializers/Text/TextSummarySerializer.js";

class CollectionSerializer extends CustomSerializer<Collection> {
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
            texts: textSummarySerializer.serializeList(collection.texts.getItems()),
        };
    }
}

export const collectionSerializer = new CollectionSerializer();