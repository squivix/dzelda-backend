import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";

class TranslationLanguageSerializer extends CustomSerializer<TranslationLanguage> {
    serialize(translationLanguage: TranslationLanguage): any {
        return {
            id: translationLanguage.id,
            code: translationLanguage.code,
            name: translationLanguage.name,
            isDefault: translationLanguage.isDefault
        };
    }
}

export const translationLanguageSerializer = new TranslationLanguageSerializer();