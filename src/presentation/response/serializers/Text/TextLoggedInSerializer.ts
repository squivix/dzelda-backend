import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Text} from "@/src/models/entities/Text.js";
import {CollectionSummarySerializer, collectionSummarySerializer} from "@/src/presentation/response/serializers/Collection/CollectionSummarySerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";


class TextLoggedInSerializer extends CustomSerializer<Text> {
    static readonly view: ViewDescription = {
        fields: ["id", "title", "content", "parsedTitle", "parsedContent", "audio", "image", "orderInCollection", "isLastInCollection", "isProcessing", "addedOn", "isPublic", "level", "pastViewersCount", "vocabsByLevel", "isBookmarked"],
        relations: {
            language: {fields: ["code"]},
            addedBy: {
                fields: [],
                relations: {user: {fields: ["username"]}}
            },
            collection: CollectionSummarySerializer.view
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

            vocabsByLevel: text.vocabsByLevel,
            isBookmarked: text.isBookmarked,
        }, assertNoUndefined);
    }
}

export const textLoggedInSerializer = new TextLoggedInSerializer()
