import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {TextSummarySerializer, textSummarySerializer} from "@/src/presentation/response/serializers/Text/TextSummarySerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class CollectionSerializer extends CustomSerializer<Collection> {
    static readonly view: ViewDescription = {
        fields: ["id", "title", "description", "image", "addedOn", "isPublic", "avgPastViewersCountPerText"],
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
            texts: TextSummarySerializer.view,
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
            texts: textSummarySerializer.serializeList(collection.texts.getItems(), {assertNoUndefined}),
        }, assertNoUndefined);
    }
}

export const collectionSerializer = new CollectionSerializer();
