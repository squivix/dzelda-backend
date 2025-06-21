import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";

class VocabTagDTO extends CustomDTO<VocabTag> {
    serialize(vocabTag: VocabTag): any {
        return {
            id: vocabTag.id,
            name: vocabTag.name,
            category: vocabTag.category?.name ?? null,
        }
    }
}

export const vocabTagDTO = new VocabTagDTO();