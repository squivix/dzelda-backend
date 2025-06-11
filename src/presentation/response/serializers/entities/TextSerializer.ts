import {Text} from "@/src/models/entities/Text.js";
import {TextSchema} from "dzelda-common";
import {collectionSerializer} from "@/src/presentation/response/serializers/entities/CollectionSerializer.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";

export class TextSerializer extends CustomEntitySerializer<Text, TextSchema> {

    definition(text: Text): CustomCallbackObject<TextSchema> {
        return {
            id: () => text.id,
            title: () => text.title,
            content: () => text.content,
            parsedTitle: () => text.parsedTitle,
            parsedContent: () => text.parsedContent,
            audio: () => text.audio,
            image: () => text.image,
            //@ts-ignore
            collection: (idOnly) => text.collection ? (idOnly ? text.collection.id : collectionSerializer.serialize(text.collection, {ignore: ["texts"]})) : null,
            orderInCollection: () => text.orderInCollection ?? undefined,
            isLastInCollection: () => text.isLastInCollection ?? undefined,
            isProcessing: () => text.isProcessing,
            addedOn: () => text.addedOn.toISOString(),
            addedBy: () => text.addedBy.user.username,
            isPublic: () => text.isPublic,
            level: () => text.level,
            language: () => text.language.code,
            vocabsByLevel: () => text.vocabsByLevel,
            pastViewersCount: () => Number(text.pastViewersCount),
            isBookmarked: () => text.isBookmarked
        };
    }

}

export const textSerializer = new TextSerializer();
