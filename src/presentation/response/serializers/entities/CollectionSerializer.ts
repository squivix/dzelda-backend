import {Collection} from "@/src/models/entities/Collection.js";
import {CustomCallbackObject, CustomEntitySerializer, IgnoreIncludeSerializedObject} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {textSerializer} from "@/src/presentation/response/serializers/entities/TextSerializer.js";
import {CollectionSchema} from "dzelda-common";

export class CollectionSerializer extends CustomEntitySerializer<Collection, CollectionSchema> {


    definition(collection: Collection): CustomCallbackObject<CollectionSchema> {
        return {
            id: () => collection.id,
            title: () => collection.title,
            description: () => collection.description,
            image: () => collection.image,
            language: () => collection.language.code,
            //@ts-ignore
            texts: () => textSerializer.serializeList(collection.texts.getItems(), {ignore: ["collection"]}),
            addedOn: () => collection.addedOn.toISOString(),
            addedBy: () => collection.addedBy.user.username,
            vocabsByLevel: () => collection.vocabsByLevel,
            isBookmarked: () => collection.isBookmarked
        };
    }

    serializeList<G extends (keyof CollectionSchema)[] | undefined = undefined, N extends (keyof CollectionSchema)[] | undefined = undefined>
    (entities: Collection[], {ignore, ...options}: {
        ignore?: G
    } = {}): Array<IgnoreIncludeSerializedObject<CollectionSchema, G, N>> {
        return super.serializeList(entities, {ignore: [...(ignore ?? []), "texts"] as G, ...options});
    }

}

export const collectionSerializer = new CollectionSerializer();
