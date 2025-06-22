import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Collection} from "@/src/models/entities/Collection.js";


class CollectionSummarySerializer extends CustomSerializer<Collection> {
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
        };
    }
}

export const collectionSummarySerializer = new CollectionSummarySerializer();