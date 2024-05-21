import {z} from "zod";
import {LanguageLevel} from "dzelda-common";

export const textTitleValidator = z.string().min(1).max(124);
export const textContentValidator = z.string().min(1).max(50_000);
export const textLevelValidator = z.nativeEnum(LanguageLevel);
