import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {Vocab} from "@/src/models/entities/Vocab.js";

class VocabForMeaningDTO extends CustomDTO<Vocab> {
    serialize(vocab: Vocab): any {
        return {
            id: vocab.id,
            text: vocab.text,
            isPhrase: vocab.isPhrase,
            language: vocab.language.code,
            learnersCount: Number(vocab.learnersCount!),
            textsCount: Number(vocab.textsCount!),
        };
    }
}

export const vocabForMeaningDTO = new VocabForMeaningDTO();