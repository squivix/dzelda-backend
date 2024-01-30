import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {batchSeed, syncIdSequence} from "@/devtools/seeders/utils.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {DATASET_MAP_LEARNER_MEANING_FILE_NAME, DATASET_MEANING_FILE_NAME} from "@/devtools/constants.js";
import path from "path";

export class MeaningSeeder extends Seeder {

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const meaningsFilePath = path.join(context.databaseDumpPath, DATASET_MEANING_FILE_NAME);
        const mapLearnerMeaningsFilePath = path.join(context.databaseDumpPath, DATASET_MAP_LEARNER_MEANING_FILE_NAME);

        if (!await fs.exists(meaningsFilePath)) {
            console.error(`${meaningsFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: meaningsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertMeaningBatch(em, batch as EntityData<Meaning>[]),
            postSeed: async () => await syncIdSequence(em, "meaning"),
            resourceName: "meaning",
        });

        if (!await fs.exists(mapLearnerMeaningsFilePath)) {
            console.error(`${mapLearnerMeaningsFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: mapLearnerMeaningsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertMapLearnerMeaningBatch(em, batch as EntityData<MapLearnerMeaning>[]),
            postSeed: async () => await syncIdSequence(em, "map_learner_meaning"),
            resourceName: "learner-meaning mappings",
        });
    }

    private async insertMeaningBatch(em: EntityManager, batch: EntityData<Meaning>[]) {
        await em.insertMany(Meaning, batch.map(meaningData => ({
            id: meaningData.id,
            text: meaningData.text,
            vocab: meaningData.vocab,
            addedBy: meaningData.addedBy,
            language: meaningData.language,
            addedOn: meaningData.addedOn,
            attributionMarkdownText: meaningData.attributionMarkdownText,
            attributionLogo: meaningData.attributionLogo,
        })));
    }

    private async insertMapLearnerMeaningBatch(em: EntityManager, batch: EntityData<MapLearnerMeaning>[]) {
        await em.insertMany(MapLearnerMeaning, batch.map(mappingData => ({
            learner: mappingData.learner,
            meaning: mappingData.meaning,
        })));
    }
}
