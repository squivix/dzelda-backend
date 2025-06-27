import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";

class TranslationLanguageSerializer extends CustomSerializer<TranslationLanguage> {
    serialize(translationLanguage: TranslationLanguage, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: translationLanguage.id,
            code: translationLanguage.code,
            name: translationLanguage.name,
            isDefault: translationLanguage.isDefault
        }, assertNoUndefined);
    }
}

export const translationLanguageSerializer = new TranslationLanguageSerializer();
