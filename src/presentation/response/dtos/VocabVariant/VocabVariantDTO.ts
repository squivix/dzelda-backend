import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";

class VocabVariantDTO extends CustomDTO<VocabVariant> {
    serialize(vocabVariant: VocabVariant): any {
        return {
            id: vocabVariant.id,
            text: vocabVariant.text,
            ttsPronunciationUrl: vocabVariant.ttsPronunciations.getItems().pop()?.url ?? null,
        }
    }
}

export const vocabVariantDTO = new VocabVariantDTO();