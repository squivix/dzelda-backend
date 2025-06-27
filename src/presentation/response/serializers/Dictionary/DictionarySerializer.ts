import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";

class DictionarySerializer extends CustomSerializer<Dictionary> {
    serialize(dictionary: Dictionary, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: dictionary.id,
            name: dictionary.name,
            lookupLink: dictionary.lookupLink,
            dictionaryLink: dictionary.dictionaryLink,
            language: dictionary.language.code,
            isPronunciation: dictionary.isPronunciation,
        }, assertNoUndefined);
    }
}

export const dictionarySerializer = new DictionarySerializer();
