import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {DictionarySchema} from "dzelda-common";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";

export class DictionarySerializer extends CustomEntitySerializer<Dictionary | MapLearnerDictionary, DictionarySchema> {
    definition(dictionaryOrMapping: Dictionary | MapLearnerDictionary): CustomCallbackObject<Partial<DictionarySchema>> {
        const dictionary = dictionaryOrMapping instanceof Dictionary ? dictionaryOrMapping : dictionaryOrMapping.dictionary;
        return {
            id: () => dictionary.id,
            name: () => dictionary.name,
            lookupLink: () => dictionary.lookupLink,
            dictionaryLink: () => dictionary.dictionaryLink,
            language: () => dictionary.language.code,
            isPronunciation: () => dictionary.isPronunciation,
        };
    }

}

export const dictionarySerializer = new DictionarySerializer();
