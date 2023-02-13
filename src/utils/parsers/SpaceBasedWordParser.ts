import {WordParser} from "@/src/utils/parsers/WordParser.js";
import {escapeRegExp} from "@/src/utils/utils.js";

type ReplaceCharsMap = { [character: string]: string }

export class SpaceBasedWordParser extends WordParser {
    notWordCharsRegex: RegExp;
    replaceCharsMap: ReplaceCharsMap;
    ignoreCase: boolean;

    constructor(wordChars: string = "", replaceCharsMap: ReplaceCharsMap = {}, ignoreCase: boolean = true) {
        super();
        this.notWordCharsRegex = new RegExp(`[^${escapeRegExp(wordChars)}]+`, "gmu");
        this.replaceCharsMap = replaceCharsMap;
        this.ignoreCase = ignoreCase;
    }

    parseText(text: string): string[] {
        let parsedText = text;

        //replace special characters
        Object.keys(this.replaceCharsMap).forEach(c => parsedText = parsedText.replace(c, this.replaceCharsMap[c]));

        //replace all non word characters with a space
        parsedText = parsedText.replace(this.notWordCharsRegex, " ");

        //trim
        parsedText = parsedText.trim();

        if (this.ignoreCase)
            //change all to lowercase
            parsedText = parsedText.toLowerCase();

        const wordSet = new Set(parsedText.split(" "));
        return Array.from(wordSet);
    }

    combine(words: string[]): string {
        return words.join(" ");
    }
}


/*
def parse_text(language, lesson_text):
    parsed_text = ""
    special_chars_in_text_qs = SpecialCharacter.objects.filter(language=language).annotate(
        querystring=Value(lesson_text, output_field=TextField())
    ).filter(querystring__icontains=F('character'))
    special_chars_in_text = dict()
    for c in special_chars_in_text_qs:
        special_chars_in_text[c.character] = c.replace_with

    for c in lesson_text:
        try:
            parsed_text += special_chars_in_text[c]
        except KeyError:
            parsed_text += regex.sub(r"[^ \p{Alphabetic}+]", " ", c)

    return regex.sub(r"\s+", " ", parsed_text.strip().lower())

*/