import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Text} from "@/src/models/entities/Text.js";


class TextSummarySerializer extends CustomSerializer<Text> {
    serialize(text: Text, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: text.id,
            title: text.title,
            audio: text.audio,
            image: text.image,
            collection: text.collection ? text.collection.id : null,
            orderInCollection: text.orderInCollection,
            isLastInCollection: text.isLastInCollection,
            isProcessing: text.isProcessing,
            addedOn: text.addedOn.toISOString(),
            isPublic: text.isPublic,
            level: text.level,
            pastViewersCount: Number(text.pastViewersCount),

            addedBy: text.addedBy.user.username,
            language: text.language.code,
        }, assertNoUndefined);
    }
}

export const textSummarySerializer = new TextSummarySerializer()
