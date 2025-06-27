import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class TranslationLanguageSerializer extends CustomSerializer<TranslationLanguage> {
    serialize(translationLanguage: TranslationLanguage, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: translationLanguage.id,
            code: translationLanguage.code,
            name: translationLanguage.name,
            isDefault: translationLanguage.isDefault
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const translationLanguageSerializer = new TranslationLanguageSerializer();