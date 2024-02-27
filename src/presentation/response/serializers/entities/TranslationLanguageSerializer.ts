import {CustomCallbackObject, CustomEntitySerializer} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {TranslationLanguageSchema} from "dzelda-common";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";

export class TranslationLanguageSerializer extends CustomEntitySerializer<TranslationLanguage, TranslationLanguageSchema> {
    definition(translationLanguage: TranslationLanguage): CustomCallbackObject<Partial<TranslationLanguage>> {
        return {
            id: () => translationLanguage.id,
            code: () => translationLanguage.code,
            name: () => translationLanguage.name,
        };
    }
}

export const translationLanguageSerializer = new TranslationLanguageSerializer();
