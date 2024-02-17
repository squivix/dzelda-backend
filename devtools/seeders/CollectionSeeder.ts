import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import fs from "fs-extra";
import {Collection} from "@/src/models/entities/Collection.js";
import {batchSeed, syncIdSequence} from "@/devtools/seeders/utils.js";
import {Seeder} from "@mikro-orm/seeder";
import path from "path";
import {DATASET_FILES} from "@/devtools/constants.js";

export class CollectionSeeder extends Seeder {

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const collectionFilePath = path.join(context.databaseDumpPath, DATASET_FILES.collection);

        if (!await fs.exists(collectionFilePath)) {
            console.error(`${collectionFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: collectionFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "collection"),
            resourceName: "collection",
        });
    }

    private async insertBatch(em: EntityManager, batch: EntityData<Collection>[]) {
        await em.insertMany(Collection, batch.map(collectionData => ({
            id: collectionData.id,
            title: collectionData.title,
            description: collectionData.description,
            language: collectionData.language,
            addedBy: collectionData.addedBy,
            image: collectionData.image,
        })));
    }
}
