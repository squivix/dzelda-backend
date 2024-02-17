import {Text} from "@/src/models/entities/Text.js";
import {CollectionSchema, TextSchema} from "dzelda-common";
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
            collection: () => text.collection ? collectionSerializer.serialize(text.collection, {ignore: ["texts"]}) as Omit<CollectionSchema, "texts"> : null,
            orderInCollection: () => text.orderInCollection ?? undefined,
            isLastInCollection: () => text.isLastInCollection ?? undefined,
            addedOn: () => text.addedOn.toISOString(),
            addedBy: () => text.addedBy.user.username,
            isPublic: () => text.isPublic,
            level: () => text.level,
            language: () => text.language.code,
            vocabsByLevel: () => text.vocabsByLevel,
            pastViewersCount: () => Number(text.pastViewersCount)
        };
    }

}

export const textSerializer = new TextSerializer();
