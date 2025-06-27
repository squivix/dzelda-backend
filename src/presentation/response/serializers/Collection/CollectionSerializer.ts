import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {textSummarySerializer} from "@/src/presentation/response/serializers/Text/TextSummarySerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

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
            texts: {
                fields: ["id", "title", "audio", "image", "collection", "orderInCollection", "isLastInCollection", "isProcessing", "addedOn", "isPublic", "level", "pastViewersCount"],
                relations: {
                    addedBy: {
                        fields: [],
                        relations: {
                            user: {
                                fields: ["username"]
                            }
                        }
                    }
                }
            },
        }
    }

    serialize(collection: Collection, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: collection.id,
            title: collection.title,
            description: collection.description,
            image: collection.image,
            addedOn: collection.addedOn.toISOString(),
            isPublic: collection.isPublic,

            language: collection.language.code,
            addedBy: collection.addedBy.user.username,
            texts: textSummarySerializer.serializeList(collection.texts.getItems(), {assertNoUndefined}),
        };

        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const collectionSerializer = new CollectionSerializer();