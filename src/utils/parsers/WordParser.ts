export abstract class WordParser {
    /**
     * Parses a text into a list of words.
     * @param text{string} The input text which will be parsed
     * @param keepDuplicates{boolean}
     * @return {string[]} A list of the words in `text`
     * */
    abstract parseText(text: string, keepDuplicates?: boolean): string[]

    abstract combine(words: string[]): string
}
