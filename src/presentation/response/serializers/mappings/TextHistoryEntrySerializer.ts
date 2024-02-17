import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {CollectionSchema, TextHistoryEntrySchema} from "dzelda-common";
import {TextHistoryEntry} from "@/src/models/entities/TextHistoryEntry.js";
import {collectionSerializer} from "@/src/presentation/response/serializers/entities/CollectionSerializer.js";

export class TextHistoryEntrySerializer extends CustomEntitySerializer<TextHistoryEntry, TextHistoryEntrySchema> {
    definition(textHistoryEntry: TextHistoryEntry): CustomCallbackObject<Partial<TextHistoryEntrySchema>> {
        //if only vocab is sent
        return {
            id: () => textHistoryEntry.text.id,
            title: () => textHistoryEntry.text.title,
            content: () => textHistoryEntry.text.content,
            parsedTitle: () => textHistoryEntry.text.parsedTitle,
            parsedContent: () => textHistoryEntry.text.parsedContent,
            audio: () => textHistoryEntry.text.audio,
            image: () => textHistoryEntry.text.image,
            addedBy: () => textHistoryEntry.text.addedBy.user.username,
            isPublic: () => textHistoryEntry.text.isPublic,
            //@ts-ignore
            collection: () => textHistoryEntry.text.collection ? collectionSerializer.serialize(textHistoryEntry.text.collection, {ignore: ["texts"]}) as Omit<CollectionSchema, "texts"> : null,
            orderInCollection: () => textHistoryEntry.text.orderInCollection ?? undefined,
            isLastInCollection: () => textHistoryEntry.text.isLastInCollection ?? undefined,
            addedOn: () => textHistoryEntry.text.addedOn.toISOString(),
            vocabsByLevel: () => textHistoryEntry.text.vocabsByLevel,
            pastViewersCount: () => Number(textHistoryEntry.text.pastViewersCount),
            timeViewed: () => textHistoryEntry.timeViewed.toISOString(),
            pastViewer: () => textHistoryEntry.pastViewer.user.username
        };
    }

}

export const textHistoryEntrySerializer = new TextHistoryEntrySerializer();
