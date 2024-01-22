import {z} from "zod";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

export const courseTitleValidator = z.string().min(1, "Title must be between 1 and 255 characters long").max(255, "Title must be between 1 and 255 characters long");
export const courseDescriptionValidator = z.string().max(500, "Description must be no longer than 500 characters");
export const courseLevelValidator = z.nativeEnum(LanguageLevel);
export const courseLevelsFilterValidator = z.nativeEnum(LanguageLevel).transform(l => [l]).or(z.array(z.nativeEnum(LanguageLevel)));
