import {z} from "zod";
import {LanguageLevel} from "dzelda-common";

export const collectionTitleValidator = z.string().min(1, "Title must be between 1 and 255 characters long").max(255, "Title must be between 1 and 255 characters long");
export const collectionDescriptionValidator = z.string().max(500, "Description must be no longer than 500 characters");
export const collectionLevelValidator = z.nativeEnum(LanguageLevel);
export const collectionLevelsFilterValidator = z.nativeEnum(LanguageLevel).transform(l => [l]).or(z.array(z.nativeEnum(LanguageLevel)));
