import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class DictionarySerializer extends CustomSerializer<Dictionary> {
    serialize(dictionary: Dictionary, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: dictionary.id,
            name: dictionary.name,
            lookupLink: dictionary.lookupLink,
            dictionaryLink: dictionary.dictionaryLink,
            language: dictionary.language.code,
            isPronunciation: dictionary.isPronunciation,
        };

        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const dictionarySerializer = new DictionarySerializer();