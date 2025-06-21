import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {meaningSummeryDTO} from "@/src/presentation/response/dtos/Meaning/MeaningSummeryDTO.js";
import {vocabTagDTO} from "@/src/presentation/response/dtos/VocabTag/VocabTagDTO.js";
import {vocabVariantDTO} from "@/src/presentation/response/dtos/VocabVariant/VocabVariantDTO.js";

class VocabDTO extends CustomDTO<Vocab> {
    serialize(vocab: Vocab): any {
        return {
            id: vocab.id,
            text: vocab.text,
            isPhrase: vocab.isPhrase,
            language: vocab.language.code,
            meanings: meaningSummeryDTO.serializeList(vocab.meanings.getItems()),
            tags: vocabTagDTO.serializeList(vocab.tags.getItems()),
            variants: vocabVariantDTO.serializeList(vocab.vocabVariants.getItems()),
            learnersCount: Number(vocab.learnersCount!),
            textsCount: Number(vocab.textsCount!),
        }
    }
}

export const vocabDTO = new VocabDTO();