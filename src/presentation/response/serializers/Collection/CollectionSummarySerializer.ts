import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {collectionFetchSpecs, CollectionFetchSpecsType} from "@/src/models/fetchSpecs/collectionFetchSpecs.js";


class CollectionSummarySerializer extends CustomSerializer<Collection> {
    readonly view: ViewDescriptionFromSpec<Collection, CollectionFetchSpecsType> = {
        fields: ["id", "title", "description", "image", "addedOn", "isPublic", "avgPastViewersCountPerText"],
        relations: {
            language: {
                fields: ["code"],
            },
            addedBy: {
                fields: [],
                relations: {
                    user: {
                        fields: ["username"]
                    }
                }
            },
        }
    }

    serialize(collection: Collection, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: collection.id,
            title: collection.title,
            description: collection.description,
            image: collection.image,
            addedOn: collection.addedOn.toISOString(),
            isPublic: collection.isPublic,

            language: collection.language.code,
            addedBy: collection.addedBy.user.username,
        }, assertNoUndefined);
    }
}

export const collectionSummarySerializer = new CollectionSummarySerializer();
