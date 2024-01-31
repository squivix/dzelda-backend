import {Dictionary, EntityData, EntityManager, ManyToOne, Property, types} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {batchSeed, syncIdSequence} from "@/devtools/seeders/utils.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {DATASET_FILES} from "@/devtools/constants.js";
import path from "path";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";

export class VocabSeeder extends Seeder {
    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const vocabsFilePath = path.join(context.databaseDumpPath, DATASET_FILES.vocab);
        const mapLearnerVocabsFilePath = path.join(context.databaseDumpPath, DATASET_FILES.mapLearnerVocab);
        const ttsVoicesFilePath = path.join(context.databaseDumpPath, DATASET_FILES.ttsVoices);
        const ttsPronunciationFilePath = path.join(context.databaseDumpPath, DATASET_FILES.ttsPronunciation);
        const humanPronunciationFilePath = path.join(context.databaseDumpPath, DATASET_FILES.humanPronunciation);

        if (!await fs.exists(vocabsFilePath)) {
            console.error(`${vocabsFilePath} not found`);
            return;
        }
        await batchSeed({
            filePath: vocabsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertVocabsBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "vocab"),
            resourceName: "vocab",
        });

        if (!await fs.exists(mapLearnerVocabsFilePath)) {
            console.error(`${mapLearnerVocabsFilePath} not found`);
            return;
        }
        await batchSeed({
            filePath: mapLearnerVocabsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertMapLearnerVocabsBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "map_learner_vocab"),
            resourceName: "learner-vocab mapping",
        });

        if (!await fs.exists(ttsVoicesFilePath)) {
            console.error(`${ttsVoicesFilePath} not found`);
            return;
        }
        await batchSeed({
            filePath: ttsVoicesFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertTTSVoicesBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "tts_voice"),
            resourceName: "TTS Voice",
        });

        if (!await fs.exists(ttsPronunciationFilePath)) {
            console.error(`${ttsPronunciationFilePath} not found`);
            return;
        }
        await batchSeed({
            filePath: ttsPronunciationFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertTTSPronunciationsBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "tts_pronunciation"),
            resourceName: "TTS Pronunciation",
        });

        if (!await fs.exists(humanPronunciationFilePath)) {
            console.error(`${humanPronunciationFilePath} not found`);
            return;
        }
        await batchSeed({
            filePath: humanPronunciationFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertHumanPronunciationsBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "human_pronunciation"),
            resourceName: "Human Pronunciation",
        });
    }

    private async insertVocabsBatch(em: EntityManager, batch: EntityData<Vocab>[]) {
        await em.insertMany(Vocab, batch.map(vocabData => ({
            id: vocabData.id,
            text: vocabData.text,
            language: vocabData.language,
            isPhrase: vocabData.isPhrase,
        })));
    }

    private async insertMapLearnerVocabsBatch(em: EntityManager, batch: EntityData<MapLearnerVocab>[]) {
        await em.insertMany(MapLearnerVocab, batch.map((mappingData) => ({
            learner: mappingData.learner,
            vocab: mappingData.vocab,
            level: mappingData.level,
            notes: mappingData.notes,
            savedOn: mappingData.savedOn
        })));
    }

    private async insertTTSVoicesBatch(em: EntityManager, batch: EntityData<TTSVoice>[]) {
        await em.insertMany(TTSVoice, batch.map((ttsVoiceData) => ({
            id: ttsVoiceData.id,
            code: ttsVoiceData.code,
            name: ttsVoiceData.name,
            gender: ttsVoiceData.gender,
            provider: ttsVoiceData.provider,
            accent: ttsVoiceData.accent,
            language: ttsVoiceData.language,
            isDefault: ttsVoiceData.isDefault
        })));
    }

    private async insertTTSPronunciationsBatch(em: EntityManager, batch: EntityData<TTSPronunciation>[]) {
        await em.insertMany(TTSPronunciation, batch.map((ttsPronunciationData) => ({
            id: ttsPronunciationData.id,
            url: ttsPronunciationData.url,
            addedOn: ttsPronunciationData.addedOn,
            vocab: ttsPronunciationData.vocab,
            voice: ttsPronunciationData.voice,
        })));
    }

    private async insertHumanPronunciationsBatch(em: EntityManager, batch: EntityData<HumanPronunciation>[]) {
        await em.insertMany(HumanPronunciation, batch.map((humanPronunciationData) => ({
            id: humanPronunciationData.id,
            url: humanPronunciationData.url,
            accent: humanPronunciationData.accent,
            source: humanPronunciationData.source,
            attributionLogo: humanPronunciationData.attributionLogo,
            attributionMarkdownText: humanPronunciationData.attributionMarkdownText,
            vocab: humanPronunciationData.vocab,
        })));
    }
}
