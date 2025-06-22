import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {attributionSourceDTO} from "@/src/presentation/response/dtos/AttributionSource/AttributionSourceDTO.js";
import {vocabForMeaningDTO} from "@/src/presentation/response/dtos/Vocab/VocabForMeaningDTO.js";
import {vocabVariantDTO} from "@/src/presentation/response/dtos/VocabVariant/VocabVariantDTO.js";

class MeaningDTO extends CustomDTO<Meaning> {
    serialize(meaning: Meaning): any {
        return {
            id: meaning.id,
            text: meaning.text,
            vocab: vocabForMeaningDTO.serialize(meaning.vocab),
            learnersCount: Number(meaning?.learnersCount),
            addedBy: meaning.addedBy == null ? "anonymous" : meaning.addedBy.user.username,
            language: meaning.language.code,
            addedOn: meaning.addedOn.toISOString(),
            attributionSource: meaning.attributionSource ? (attributionSourceDTO.serialize(meaning.attributionSource)) : null,
            attribution: meaning.attribution,
            vocabVariant: meaning.vocabVariant ? (vocabVariantDTO.serialize(meaning.vocabVariant)) : null
        };
    }
}

export const meaningDTO = new MeaningDTO();