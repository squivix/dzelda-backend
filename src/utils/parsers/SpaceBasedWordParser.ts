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

    parseText(text: string, keepDuplicates = false): string[] {
        //TODO investigate why - is being added as a vocab with sample data
        let parsedText = text;

        //replace special characters
        Object.keys(this.replaceCharsMap).forEach(c => parsedText = parsedText.replace(c, this.replaceCharsMap[c]));

        //replace all non-word characters with a space
        parsedText = parsedText.replace(this.notWordCharsRegex, " ");

        //trim
        parsedText = parsedText.trim();

        if (this.ignoreCase)
            //change all to lowercase
            parsedText = parsedText.toLowerCase();
        const wordArray = parsedText.split(" ").filter(w => w !== "");
        if (keepDuplicates)
            return wordArray;
        else
            return Array.from(new Set(wordArray));
    }

    combine(words: string[]): string {
        return words.join(" ");
    }
}
