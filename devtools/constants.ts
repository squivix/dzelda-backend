export const DATA_DIR = "data" as const;
export const DEFAULT_BATCH_SIZE = 10_000;
export const DATASET_FILES = {
    language: "languages.jsonl",
    translationLanguage: "translation_languages.jsonl",
    attributionSource: "attribution_sources.jsonl",
    user: "users.jsonl",
    dictionary: "dictionaries.jsonl",
    collection: "collections.jsonl",
    text: "texts.jsonl",
    vocab: "vocabs.jsonl",
    meaning: "meanings.jsonl",
    profile: "profiles.jsonl",
    ttsPronunciation: "tts_pronunciations.jsonl",
    humanPronunciation: "human_pronunciations.jsonl",
    ttsVoices: "tts_voices.jsonl",
    mapLearnerMeaning: "map_learner_meanings.jsonl",
    mapLearnerVocab: "map_learner_vocabs.jsonl",
    mapTextVocab: "map_text_vocabs.jsonl",
    mapLearnerLanguage: "map_learner_languages.jsonl",
    mapLearnerDictionary: "map_learner_dictionaries.jsonl",
    vocabTagCategory: "vocab_tag_categories.jsonl",
    vocabTag: "vocab_tags.jsonl",
    mapVocabTag: "map_vocab_tags.jsonl",
    mapVocabRootFormFilePath: "map_vocab_root_forms.jsonl"
};
