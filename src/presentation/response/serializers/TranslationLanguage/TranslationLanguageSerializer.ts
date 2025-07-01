import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";
import {ViewDescriptionFromSpec} from "@/src/models/viewResolver.js";
import {TranslationLanguageFetchSpecsType} from "@/src/models/fetchSpecs/translationLanguageFetchSpecs.js";

class TranslationLanguageSerializer extends CustomSerializer<TranslationLanguage> {
    readonly view: ViewDescriptionFromSpec<TranslationLanguage, TranslationLanguageFetchSpecsType> = {
        fields: ["id", "code", "name", "isDefault"],
    }

    serialize(translationLanguage: TranslationLanguage, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: translationLanguage.id,
            code: translationLanguage.code,
            name: translationLanguage.name,
            isDefault: translationLanguage.isDefault,
        }, assertNoUndefined);
    }
}

export const translationLanguageSerializer = new TranslationLanguageSerializer();
