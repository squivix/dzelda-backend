import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";

class DictionarySerializer extends CustomSerializer<Dictionary> {
    serialize(dictionary: Dictionary): any {
        return {
            id: dictionary.id,
            name: dictionary.name,
            lookupLink: dictionary.lookupLink,
            dictionaryLink: dictionary.dictionaryLink,
            language: dictionary.language.code,
            isPronunciation: dictionary.isPronunciation,
        };
    }
}

export const dictionarySerializer = new DictionarySerializer();