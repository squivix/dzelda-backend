import {Dictionary, EntityData, EntityManager, RequiredEntityData} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {batchSeed, syncIdSequence} from "@/src/seeders/utils.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";

export class MeaningSeeder extends Seeder {
    static readonly FILE_NAME = "meanings.jsonl";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const meaningsFilePath = `${context.databaseDumpPath}/${MeaningSeeder.FILE_NAME}`;

        if (!await fs.exists(meaningsFilePath)) {
            console.error(`${meaningsFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: meaningsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertBatch(em, batch as (EntityData<Meaning> & { learners: number[] })[]),
            postSeed: async () => await syncIdSequence(em, "meaning"),
            resourceName: "meaning",
        });
    }

    private async insertBatch(em: EntityManager, batch: (EntityData<Meaning> & { learners: number[] })[]) {
        const learnerMappings: RequiredEntityData<MapLearnerMeaning>[] = [];
        await em.insertMany(Meaning, batch.map(meaningData => {
            const data = {
                id: meaningData.id,
                text: meaningData.text,
                vocab: meaningData.vocab,
                addedBy: meaningData.addedBy,
                language: meaningData.language,
                addedOn: meaningData.addedOn
            };
            learnerMappings.push(...meaningData.learners.map(learner => ({learner, meaning: meaningData.id!})));
            return data;
        }));
        await em.insertMany(MapLearnerMeaning, learnerMappings);
    }
}
