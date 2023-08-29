import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {MeaningFactory} from "@/src/seeders/factories/MeaningFactory.js";
import {batchSeed, syncIdSequence} from "@/src/seeders/utils.js";

export class MeaningSeeder extends Seeder {
    static readonly FILE_NAME = "meanings.jsonl";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const meaningsFilePath = `${context.datasetPath}/${MeaningSeeder.FILE_NAME}`;

        if (!await fs.exists(meaningsFilePath)) {
            console.error(`${MeaningSeeder.FILE_NAME} not found`);
            return;
        }

        await batchSeed({
            filePath: meaningsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "meaning"),
            resourceName: "meaning",
        });
    }

    private async insertBatch(em: EntityManager, batch: EntityData<Meaning>[]) {
        const meaningFactory = new MeaningFactory(em);
        const entities = batch.map(meaningData => meaningFactory.makeEntity({
            id: meaningData.id,
            text: meaningData.text,
            vocab: meaningData.vocab,
            addedBy: meaningData.addedBy,
            language: meaningData.language,
            addedOn: meaningData.addedOn,
            learners: meaningData.learners
        }));
        await em.persistAndFlush(entities);
    }
}
