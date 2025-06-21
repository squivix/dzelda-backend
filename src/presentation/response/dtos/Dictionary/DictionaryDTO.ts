import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";

class DictionaryDTO extends CustomDTO<Dictionary> {
    serialize(dictionary: Dictionary): any {
        return {
            id: dictionary.id,
            name: dictionary.name,
            lookupLink: dictionary.lookupLink,
            dictionaryLink: dictionary.dictionaryLink,
            language: dictionary.language.code,
            isPronunciation: dictionary.isPronunciation,
        }
    }
}

export const dictionaryDTO = new DictionaryDTO();