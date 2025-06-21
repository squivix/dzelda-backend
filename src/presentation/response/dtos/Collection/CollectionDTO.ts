import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {textSummaryDTO} from "@/src/presentation/response/dtos/Text/TextSummaryDTO.js";

class CollectionDTO extends CustomDTO<Collection> {
    serialize(collection: Collection): any {
        return {
            id: collection.id,
            title: collection.title,
            description: collection.description,
            image: collection.image,
            language: collection.language.code,
            addedOn: collection.addedOn.toISOString(),
            addedBy: collection.addedBy.user.username,
            isPublic: collection.isPublic,
            texts: textSummaryDTO.serializeList(collection.texts.getItems()),
            vocabsByLevel: collection.vocabsByLevel,
            isBookmarked: collection.isBookmarked,
        }
    }
}

export const collectionDTO = new CollectionDTO();