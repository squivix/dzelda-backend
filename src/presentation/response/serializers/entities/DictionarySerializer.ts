import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {DictionarySchema} from "dzelda-types";

export class DictionarySerializer extends CustomEntitySerializer<Dictionary, DictionarySchema> {
    definition(dictionary: Dictionary): CustomCallbackObject<Partial<DictionarySchema>> {
        return {
            id: () => dictionary.id,
            name: () => dictionary.name,
            link: () => dictionary.lookupLink,
            language: () => dictionary.language.code,
        };
    }

}

export const dictionarySerializer = new DictionarySerializer();
