import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {vocabVariantDTO} from "@/src/presentation/response/dtos/VocabVariant/VocabVariantDTO.js";

class MeaningSummeryDTO extends CustomDTO<Meaning> {
    serialize(meaning: Meaning): any {
        return {
            id: meaning.id,
            text: meaning.text,
            vocab: meaning.vocab.id,
            learnersCount: Number(meaning?.learnersCount),
            addedBy: meaning.addedBy == null ? "anonymous" : meaning.addedBy.user.username,
            language: meaning.language.code,
            addedOn: meaning.addedOn.toISOString(),
            attributionSource: meaning.attributionSource ? meaning.attributionSource.id : null,
            attribution: meaning.attribution,
            vocabVariant: meaning.vocabVariant ? vocabVariantDTO.serialize(meaning.vocabVariant) : null
        };
    }
}

export const meaningSummeryDTO = new MeaningSummeryDTO();