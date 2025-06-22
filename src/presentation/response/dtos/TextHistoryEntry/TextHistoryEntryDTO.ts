import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {TextHistoryEntry} from "@/src/models/entities/TextHistoryEntry.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {collectionSummaryDTO} from "@/src/presentation/response/dtos/Collection/CollectionSummaryDTO.js";


class TextHistoryEntryDTO extends CustomDTO<TextHistoryEntry> {
    serialize(textHistoryEntry: TextHistoryEntry): any {
        return {
            id: textHistoryEntry.text.id,
            title: textHistoryEntry.text.title,
            content: textHistoryEntry.text.content,
            parsedTitle: textHistoryEntry.text.parsedTitle,
            parsedContent: textHistoryEntry.text.parsedContent,
            audio: textHistoryEntry.text.audio,
            image: textHistoryEntry.text.image,
            collection: textHistoryEntry.text.collection ? collectionSummaryDTO.serialize(textHistoryEntry.text.collection) : null,
            orderInCollection: textHistoryEntry.text.orderInCollection,
            isLastInCollection: textHistoryEntry.text.isLastInCollection,
            isProcessing: textHistoryEntry.text.isProcessing,
            addedOn: textHistoryEntry.text.addedOn.toISOString(),
            addedBy: textHistoryEntry.text.addedBy.user.username,
            isPublic: textHistoryEntry.text.isPublic,
            // level: textHistoryEntry.text.level,
            // language: textHistoryEntry.text.language.code,
            pastViewersCount: Number(textHistoryEntry.text.pastViewersCount),
            vocabsByLevel: textHistoryEntry.text.vocabsByLevel, // always logged in remember?
            // isBookmarked: textHistoryEntry.text.text.isBookmarked,

            timeViewed: textHistoryEntry.timeViewed.toISOString(),
            pastViewer: textHistoryEntry.pastViewer?.user.username ?? AnonymousUser.name,
        };
    }
}

export const textHistoryEntryDTO = new TextHistoryEntryDTO()