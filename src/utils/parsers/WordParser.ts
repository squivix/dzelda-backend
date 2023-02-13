export abstract class WordParser {
    /**
     * Parses a text into a list of words.
     * @param text{string} The input text which will be parsed
     * @return {string[]} A list of the words in `text`
     * */
    abstract parseText(text: string): string[]

    abstract combine(words: string[]): string
}