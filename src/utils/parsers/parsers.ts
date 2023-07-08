import {SpaceBasedWordParser} from "@/src/utils/parsers/SpaceBasedWordParser.js";
import {WordParser} from "@/src/utils/parsers/WordParser.js";

export const parsers: { [languageCode: string]: WordParser } = {
    "en": new SpaceBasedWordParser("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'-"),
    "es": new SpaceBasedWordParser("abcdefghijklmnopqrstuvwxyzáéíñóúüABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÑÓÚÜ-")
};

export function getParser(languageCode: string) {
    return parsers[languageCode];
}
