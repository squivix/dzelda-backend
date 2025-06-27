import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class DictionarySerializer extends CustomSerializer<Dictionary> {
    static readonly view: ViewDescription = {
        fields: ["id", "name", "lookupLink", "dictionaryLink", "isPronunciation"],
        relations: {
            language: {fields: ["code"]}
        }
    }

    serialize(dictionary: Dictionary, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: dictionary.id,
            name: dictionary.name,
            lookupLink: dictionary.lookupLink,
            dictionaryLink: dictionary.dictionaryLink,
            isPronunciation: dictionary.isPronunciation,

            language: dictionary.language.code,
        }, assertNoUndefined);
    }
}

export const dictionarySerializer = new DictionarySerializer();
