import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Text} from "@/src/models/entities/Text.js";
import {collectionSummarySerializer} from "@/src/presentation/response/serializers/Collection/CollectionSummarySerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";


class TextSerializer extends CustomSerializer<Text> {
    static readonly view: ViewDescription = {
        fields: ["id", "title", "content", "parsedTitle", "parsedContent", "audio", "image", "orderInCollection", "isLastInCollection", "isProcessing", "addedOn", "isPublic", "level", "pastViewersCount"],
        relations: {
            language: {fields: ["code"]},
            addedBy: {
                fields: [],
                relations: {user: {fields: ["username"]}}
            },
            collection: {
                fields: ["id", "title", "description", "image", "addedOn", "isPublic"],
                relations: {
                    language: {fields: ["code"]},
                    addedBy: {
                        fields: [],
                        relations: {user: {fields: ["username"]}}
                    },
                }
            }
        }
    }

    serialize(text: Text, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: text.id,
            title: text.title,
            content: text.content,
            parsedTitle: text.parsedTitle,
            parsedContent: text.parsedContent,
            audio: text.audio,
            image: text.image,
            orderInCollection: text.orderInCollection,
            isLastInCollection: text.isLastInCollection,
            isProcessing: text.isProcessing,
            addedOn: text.addedOn.toISOString(),
            isPublic: text.isPublic,
            level: text.level,
            pastViewersCount: Number(text.pastViewersCount),

            language: text.language.code,
            addedBy: text.addedBy.user.username,
            collection: text.collection ? collectionSummarySerializer.serialize(text.collection, {assertNoUndefined}) : null,
        }, assertNoUndefined);
    }
}

export const textSerializer = new TextSerializer()
