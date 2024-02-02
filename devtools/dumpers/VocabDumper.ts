import {EntityManager} from "@mikro-orm/core";
import {batchDump} from "@/devtools/dumpers/utils.js";
import path from "path";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {DATASET_FILES} from "@/devtools/constants.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";

export async function dumpVocabs({em, batchSize, dataPath}: { em: EntityManager, batchSize: number, dataPath: string }) {
    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.vocab),
        entityClass: Vocab,
        resourceName: "vocab",
        writeEntity: (vocab: Vocab) => ({
            id: vocab.id,
            text: vocab.text,
            language: vocab.language.id,
            isPhrase: vocab.isPhrase,
        })
    });

    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.mapLearnerVocab),
        entityClass: MapLearnerVocab,
        resourceName: "learner-vocab mapping",
        writeEntity: (mapping: MapLearnerVocab) => ({
            learner: mapping.learner.id,
            vocab: mapping.vocab.id,
            level: mapping.level,
            notes: mapping.notes,
            savedOn: mapping.savedOn
        })
    });


    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.ttsVoices),
        entityClass: TTSVoice,
        resourceName: "TTS voice",
        writeEntity: (voice: TTSVoice) => ({
            id: voice.id,
            code: voice.code,
            name: voice.name,
            gender: voice.gender,
            provider: voice.provider,
            accent: voice.accent,
            language: voice.language,
            isDefault: voice.isDefault,
        })
    });

    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.ttsPronunciation),
        entityClass: TTSPronunciation,
        resourceName: "TTS pronunciation",
        writeEntity: (ttsPronunciation: TTSPronunciation) => ({
            id: ttsPronunciation.id,
            url: ttsPronunciation.url,
            addedOn: ttsPronunciation.addedOn,
            voice: ttsPronunciation.voice,
            vocab: ttsPronunciation.vocab,
        })
    });

    await batchDump({
        em,
        batchSize,
        filePath: path.join(dataPath, DATASET_FILES.humanPronunciation),
        entityClass: HumanPronunciation,
        resourceName: "Human pronunciation",
        writeEntity: (humanPronunciation: HumanPronunciation) => ({
            id: humanPronunciation.id,
            text: humanPronunciation.text,
            language: humanPronunciation.language.id,
            url: humanPronunciation.url,
            accent: humanPronunciation.accent,
            source: humanPronunciation.source,
            attributionMarkdownText: humanPronunciation.attributionMarkdownText,
            attributionLogo: humanPronunciation.attributionLogo,
        })
    });
}
