import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";

class TranslationLanguageDTO extends CustomDTO<TranslationLanguage> {
        serialize(translationLanguage: TranslationLanguage): any {
            return {
                id: translationLanguage.id,
                code: translationLanguage.code,
                name: translationLanguage.name,
                isDefault: translationLanguage.isDefault
            };
        }
    }

    export const translationLanguageDTO = new TranslationLanguageDTO();