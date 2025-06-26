import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {textSummaryLoggedInSerializer} from "@/src/presentation/response/serializers/Text/TextSummaryLoggedInSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

export class CollectionLoggedInSerializer extends CustomSerializer<Collection> {
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
            texts: {
                fields: ["id", "title", "audio", "image", "collection", "orderInCollection", "isLastInCollection", "isProcessing", "addedOn", "isPublic", "level", "pastViewersCount", "vocabsByLevel", "isBookmarked"],
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

    serialize(collection: Collection): any {
        return {
            id: collection.id,
            title: collection.title,
            description: collection.description,
            image: collection.image,
            addedOn: collection.addedOn.toISOString(),
            isPublic: collection.isPublic,

            language: collection.language.code,
            addedBy: collection.addedBy.user.username,
            texts: textSummaryLoggedInSerializer.serializeList(collection.texts.getItems()),

            vocabsByLevel: collection.vocabsByLevel,
            isBookmarked: collection.isBookmarked,
        };
    }
}

export const collectionLoggedInSerializer = new CollectionLoggedInSerializer();
