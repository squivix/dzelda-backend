import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Text} from "@/src/models/entities/Text.js";


class TextSummarySerializer extends CustomSerializer<Text> {
    serialize(text: Text): any {
        return {
            id: text.id,
            title: text.title,
            audio: text.audio,
            image: text.image,
            collection: text.collection ? text.collection.id : null,
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
    }
}

export const textSummarySerializer = new TextSummarySerializer()