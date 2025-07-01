import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {DictionaryFetchSpecsType} from "@/src/models/fetchSpecs/dictionaryFetchSpecs.js";

class DictionarySerializer extends CustomSerializer<Dictionary> {
    readonly view: ViewDescriptionFromSpec<Dictionary, DictionaryFetchSpecsType> = {
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
