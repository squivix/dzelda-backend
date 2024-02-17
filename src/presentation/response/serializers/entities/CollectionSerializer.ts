import {Collection} from "@/src/models/entities/Collection.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {textSerializer} from "@/src/presentation/response/serializers/entities/TextSerializer.js";
import {CollectionSchema, TextSchema} from "dzelda-common";

export class CollectionSerializer extends CustomEntitySerializer<Collection, CollectionSchema> {


    definition(collection: Collection): CustomCallbackObject<CollectionSchema> {
        return {
            id: () => collection.id,
            title: () => collection.title,
            description: () => collection.description,
            image: () => collection.image,
            language: () => collection.language.code,
            // @ts-ignore
            texts: () => textSerializer.serializeList(collection.texts.getItems(), {ignore: ["collection"]}) as Omit<TextSchema, "collection">[],
            addedOn: () => collection.addedOn.toISOString(),
            addedBy: () => collection.addedBy.user.username,
            vocabsByLevel: () => collection.vocabsByLevel,
            isBookmarked: () => collection.isBookmarked
        };
    }

    serializeList(entities: Collection[], {ignore = [], ...options}: { ignore?: (keyof CollectionSchema)[] } = {}): Partial<CollectionSchema>[] {
        return super.serializeList(entities, {ignore: [...ignore, "texts"], ...options});
    }

}

export const collectionSerializer = new CollectionSerializer();
