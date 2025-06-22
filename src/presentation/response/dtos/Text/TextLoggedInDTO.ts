import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {Text} from "@/src/models/entities/Text.js";
import {collectionSummaryDTO} from "@/src/presentation/response/dtos/Collection/CollectionSummaryDTO.js";


class TextLoggedInDTO extends CustomDTO<Text> {
    serialize(text: Text): any {
        return {
            id: text.id,
            title: text.title,
            content: text.content,
            parsedTitle: text.parsedTitle,
            parsedContent: text.parsedContent,
            audio: text.audio,
            image: text.image,
            collection: text.collection ? collectionSummaryDTO.serialize(text.collection) : null,
            orderInCollection: text.orderInCollection,
            isLastInCollection: text.isLastInCollection,
            isProcessing: text.isProcessing,
            addedOn: text.addedOn.toISOString(),
            addedBy: text.addedBy.user.username,
            isPublic: text.isPublic,
            level: text.level,
            language: text.language.code,
            pastViewersCount: Number(text.pastViewersCount),

            vocabsByLevel: text.vocabsByLevel,
            isBookmarked: text.isBookmarked
        };
    }
}

export const textLoggedInDTO = new TextLoggedInDTO()