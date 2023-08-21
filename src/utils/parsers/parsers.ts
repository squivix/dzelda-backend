import {SpaceBasedWordParser} from "@/src/utils/parsers/SpaceBasedWordParser.js";
import {WordParser} from "@/src/utils/parsers/WordParser.js";

export const parsers: { [languageCode: string]: WordParser } = {
    //temporary naive parsers
    "en": new SpaceBasedWordParser("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'-"),
    "es": new SpaceBasedWordParser("abcdefghijklmnopqrstuvwxyzáéíñóúüABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÑÓÚÜ-"),
    "it": new SpaceBasedWordParser("abcdefghilmnopqrstuvzABCDEFGHILMNOPQRSTUVZ'"),
    "de": new SpaceBasedWordParser("abcdefghijklmnopqrstuvwxyzäöüABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ"),
    "pt": new SpaceBasedWordParser("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáàâãéèêíìîóòôõúùûÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛ'"),
    "fr": new SpaceBasedWordParser("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZéèàâêîôûçëïüœ'"),
    "la": new SpaceBasedWordParser("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"),
};

export function getParser(languageCode: string) {
    return parsers[languageCode];
}
