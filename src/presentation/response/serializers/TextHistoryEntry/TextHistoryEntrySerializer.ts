import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {TextHistoryEntry} from "@/src/models/entities/TextHistoryEntry.js";
import {AnonymousUser} from "@/src/models/entities/auth/User.js";
import {collectionSummarySerializer} from "@/src/presentation/response/serializers/Collection/CollectionSummarySerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";


class TextHistoryEntrySerializer extends CustomSerializer<TextHistoryEntry> {
    readonly view: ViewDescription = {
        fields: ["timeViewed"],
        relations: {
            pastViewer: {
                fields: [],
                relations: {user: {fields: ["username"]}}
            },
            text: {
                // "level","isBookmarked"
                fields: ["id", "title", "content", "parsedTitle", "parsedContent", "audio", "image", "orderInCollection", "isLastInCollection", "isProcessing", "addedOn", "isPublic", "pastViewersCount", "vocabsByLevel"],
                relations: {
                    // language: {fields: ["code"]},
                    addedBy: {
                        fields: [],
                        relations: {user: {fields: ["username"]}}
                    },
                    collection: collectionSummarySerializer.view
                }
            }
        }
    }

    serialize(textHistoryEntry: TextHistoryEntry, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: textHistoryEntry.text.id,
            title: textHistoryEntry.text.title,
            content: textHistoryEntry.text.content,
            parsedTitle: textHistoryEntry.text.parsedTitle,
            parsedContent: textHistoryEntry.text.parsedContent,
            audio: textHistoryEntry.text.audio,
            image: textHistoryEntry.text.image,
            orderInCollection: textHistoryEntry.text.orderInCollection,
            isLastInCollection: textHistoryEntry.text.isLastInCollection,
            isProcessing: textHistoryEntry.text.isProcessing,
            addedOn: textHistoryEntry.text.addedOn.toISOString(),
            isPublic: textHistoryEntry.text.isPublic,
            // level: textHistoryEntry.text.level,
            pastViewersCount: Number(textHistoryEntry.text.pastViewersCount),

            // language: textHistoryEntry.text.language.code,
            addedBy: textHistoryEntry.text.addedBy.user.username,
            collection: textHistoryEntry.text.collection ? collectionSummarySerializer.serialize(textHistoryEntry.text.collection, {assertNoUndefined}) : null,

            vocabsByLevel: textHistoryEntry.text.vocabsByLevel, // always logged in remember?
            // isBookmarked: textHistoryEntry.text.text.isBookmarked,

            timeViewed: textHistoryEntry.timeViewed.toISOString(),
            pastViewer: textHistoryEntry.pastViewer?.user.username ?? AnonymousUser.name,
        }, assertNoUndefined);
    }
}

export const textHistoryEntrySerializer = new TextHistoryEntrySerializer()
