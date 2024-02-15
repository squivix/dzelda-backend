import {Collection} from "@/src/models/entities/Collection.js";
import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {lessonSerializer} from "@/src/presentation/response/serializers/entities/LessonSerializer.js";
import {CollectionSchema, LessonSchema} from "dzelda-common";

export class CollectionSerializer extends CustomEntitySerializer<Collection, CollectionSchema> {


    definition(collection: Collection): CustomCallbackObject<CollectionSchema> {
        return {
            id: () => collection.id,
            title: () => collection.title,
            description: () => collection.description,
            image: () => collection.image,
            language: () => collection.language.code,
            // @ts-ignore
            lessons: () => lessonSerializer.serializeList(collection.lessons.getItems(), {ignore: ["collection"]}) as Omit<LessonSchema, "collection">[],
            addedOn: () => collection.addedOn.toISOString(),
            addedBy: () => collection.addedBy.user.username,
            vocabsByLevel: () => collection.vocabsByLevel,
            isBookmarked: () => collection.isBookmarked
        };
    }

    serializeList(entities: Collection[], {ignore = [], ...options}: { ignore?: (keyof CollectionSchema)[] } = {}): Partial<CollectionSchema>[] {
        return super.serializeList(entities, {ignore: [...ignore, "lessons"], ...options});
    }

}

export const collectionSerializer = new CollectionSerializer();
