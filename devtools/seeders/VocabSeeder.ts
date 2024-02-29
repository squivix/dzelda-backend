import {Dictionary, EntityData, EntityManager, RequiredEntityData} from "@mikro-orm/core";
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
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {MapVocabTag} from "@/src/models/entities/MapVocabTag.js";
import {MapVocabRootForm} from "@/src/models/entities/MapVocabRootForm.js";
import {VocabTagCategory} from "@/src/models/entities/VocabTagCategory.js";

export class VocabSeeder extends Seeder {
    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const vocabsFilePath = path.join(context.databaseDumpPath, DATASET_FILES.vocab);
        const mapLearnerVocabsFilePath = path.join(context.databaseDumpPath, DATASET_FILES.mapLearnerVocab);
        const ttsVoicesFilePath = path.join(context.databaseDumpPath, DATASET_FILES.ttsVoices);
        const ttsPronunciationFilePath = path.join(context.databaseDumpPath, DATASET_FILES.ttsPronunciation);
        const humanPronunciationFilePath = path.join(context.databaseDumpPath, DATASET_FILES.humanPronunciation);
        const vocabTagCategoryFilePath = path.join(context.databaseDumpPath, DATASET_FILES.vocabTagCategory);
        const vocabTagFilePath = path.join(context.databaseDumpPath, DATASET_FILES.vocabTag);
        const mapVocabTagFilePath = path.join(context.databaseDumpPath, DATASET_FILES.mapVocabTag);
        const mapVocabRootFormFilePath = path.join(context.databaseDumpPath, DATASET_FILES.mapVocabRootFormFilePath);

        if (!await fs.exists(vocabsFilePath))
            console.error(`${vocabsFilePath} not found`);
        else {
            await batchSeed({
                filePath: vocabsFilePath,
                batchSize: context.batchSize,
                insertBatch: (batch) => this.insertVocabsBatch(em, batch),
                postSeed: async () => await syncIdSequence(em, "vocab"),
                resourceName: "vocab",
            });
        }
        if (!await fs.exists(mapLearnerVocabsFilePath))
            console.error(`${mapLearnerVocabsFilePath} not found`);
        else {
            await batchSeed({
                filePath: mapLearnerVocabsFilePath,
                batchSize: context.batchSize,
                insertBatch: (batch) => this.insertMapLearnerVocabsBatch(em, batch),
                postSeed: async () => await syncIdSequence(em, "map_learner_vocab"),
                resourceName: "learner-vocab mapping",
            });
        }

        if (!await fs.exists(ttsVoicesFilePath))
            console.error(`${ttsVoicesFilePath} not found`);
        else {
            await batchSeed({
                filePath: ttsVoicesFilePath,
                batchSize: context.batchSize,
                insertBatch: (batch) => this.insertTTSVoicesBatch(em, batch),
                postSeed: async () => await syncIdSequence(em, "tts_voice"),
                resourceName: "TTS Voice",
            });
        }

        if (!await fs.exists(ttsPronunciationFilePath))
            console.error(`${ttsPronunciationFilePath} not found`);
        else {
            await batchSeed({
                filePath: ttsPronunciationFilePath,
                batchSize: context.batchSize,
                insertBatch: (batch) => this.insertTTSPronunciationsBatch(em, batch),
                postSeed: async () => await syncIdSequence(em, "tts_pronunciation"),
                resourceName: "TTS Pronunciation",
            });
        }

        if (!await fs.exists(humanPronunciationFilePath))
            console.error(`${humanPronunciationFilePath} not found`);
        else {
            await batchSeed({
                filePath: humanPronunciationFilePath,
                batchSize: context.batchSize,
                insertBatch: (batch) => this.insertHumanPronunciationsBatch(em, batch),
                postSeed: async () => await syncIdSequence(em, "human_pronunciation"),
                resourceName: "Human Pronunciation",
            });
        }

        if (!await fs.exists(vocabTagCategoryFilePath))
            console.error(`${vocabTagCategoryFilePath} not found`);
        else {
            await batchSeed({
                filePath: vocabTagCategoryFilePath,
                batchSize: context.batchSize,
                insertBatch: (batch) => this.insertVocabTagCategoryBatch(em, batch),
                postSeed: async () => await syncIdSequence(em, "vocab_tag_category"),
                resourceName: "vocab tag category",
            });
        }

        if (!await fs.exists(vocabTagFilePath))
            console.error(`${vocabTagFilePath} not found`);
        else {
            await batchSeed({
                filePath: vocabTagFilePath,
                batchSize: context.batchSize,
                insertBatch: (batch) => this.insertVocabTagBatch(em, batch),
                postSeed: async () => await syncIdSequence(em, "vocab_tag"),
                resourceName: "vocab tag",
            });
        }

        if (!await fs.exists(mapVocabTagFilePath))
            console.error(`${mapVocabTagFilePath} not found`);
        else {
            await batchSeed({
                filePath: mapVocabTagFilePath,
                batchSize: context.batchSize,
                insertBatch: (batch) => this.insertMapVocabTagBatch(em, batch),
                postSeed: async () => await syncIdSequence(em, "map_vocab_tag"),
                resourceName: "vocab-tag mapping",
            });
        }

        if (!await fs.exists(mapVocabRootFormFilePath))
            console.error(`${mapVocabRootFormFilePath} not found`);
        else {
            await batchSeed({
                filePath: mapVocabRootFormFilePath,
                batchSize: context.batchSize,
                insertBatch: (batch) => this.insertMapVocabRootFormBatch(em, batch),
                postSeed: async () => await syncIdSequence(em, "map_vocab_root_form"),
                resourceName: "vocab-root-form mapping",
            });
        }
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
            accentCountryCode: ttsVoiceData.accentCountryCode,
            language: ttsVoiceData.language,
            isDefault: ttsVoiceData.isDefault,
            synthesizeParams: ttsVoiceData.synthesizeParams,
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
            text: humanPronunciationData.text,
            parsedText: humanPronunciationData.parsedText,
            language: humanPronunciationData.language,
            speakerCountryCode: humanPronunciationData.speakerCountryCode,
            speakerRegion: humanPronunciationData.speakerRegion,
            attribution: humanPronunciationData.attribution,
            attributionSource: humanPronunciationData.attributionSource,
        } as RequiredEntityData<HumanPronunciation>)));
    }

    private async insertVocabTagCategoryBatch(em: EntityManager, batch: EntityData<VocabTagCategory>[]) {
        await em.insertMany(VocabTagCategory, batch.map((vocabTagCategoryData) => ({
            id: vocabTagCategoryData.id,
            name: vocabTagCategoryData.name,
        } as RequiredEntityData<VocabTagCategory>)));
    }

    private async insertVocabTagBatch(em: EntityManager, batch: EntityData<VocabTag>[]) {
        await em.insertMany(VocabTag, batch.map((vocabTagData) => ({
            id: vocabTagData.id,
            name: vocabTagData.name,
            category: vocabTagData.category,
        } as RequiredEntityData<VocabTag>)));
    }

    private async insertMapVocabTagBatch(em: EntityManager, batch: EntityData<MapVocabTag>[]) {
        await em.insertMany(MapVocabTag, batch.map((mappingData) => ({
            vocab: mappingData.vocab,
            tag: mappingData.tag
        } as RequiredEntityData<MapVocabTag>)));
    }

    private async insertMapVocabRootFormBatch(em: EntityManager, batch: EntityData<MapVocabRootForm>[]) {
        await em.insertMany(MapVocabRootForm, batch.map((mappingData) => ({
            vocab: mappingData.vocab,
            rootForm: mappingData.rootForm
        } as RequiredEntityData<MapVocabRootForm>)));
    }
}
