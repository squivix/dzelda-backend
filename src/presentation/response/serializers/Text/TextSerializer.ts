import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Text} from "@/src/models/entities/Text.js";
import {collectionSummarySerializer} from "@/src/presentation/response/serializers/Collection/CollectionSummarySerializer.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";


class TextSerializer extends CustomSerializer<Text> {
    serialize(text: Text, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: text.id,
            title: text.title,
            content: text.content,
            parsedTitle: text.parsedTitle,
            parsedContent: text.parsedContent,
            audio: text.audio,
            image: text.image,
            collection: text.collection ? collectionSummarySerializer.serialize(text.collection, {assertNoUndefined}) : null,
            orderInCollection: text.orderInCollection,
            isLastInCollection: text.isLastInCollection,
            isProcessing: text.isProcessing,
            addedOn: text.addedOn.toISOString(),
            addedBy: text.addedBy.user.username,
            isPublic: text.isPublic,
            level: text.level,
            language: text.language.code,
            pastViewersCount: Number(text.pastViewersCount),
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const textSerializer = new TextSerializer()