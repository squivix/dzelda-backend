import {Dictionary, EntityData, EntityManager, RequiredEntityData} from "@mikro-orm/core";
import fs from "fs-extra";
import {batchSeed, syncIdSequence} from "@/devtools/seeders/utils.js";
import {Seeder} from "@mikro-orm/seeder";
import path from "path";
import {DATASET_FILES} from "@/devtools/constants.js";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";

export class AttributionSourceSeeder extends Seeder {

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const attributionFilePath = path.join(context.databaseDumpPath, DATASET_FILES.attributionSource);

        if (!await fs.exists(attributionFilePath)) {
            console.error(`${attributionFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: attributionFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "attribution_source"),
            resourceName: "attribution sources",
        });
    }

    private async insertBatch(em: EntityManager, batch: EntityData<AttributionSource>[]) {
        await em.insertMany(AttributionSource, batch.map(attributionSourceData => ({
            id: attributionSourceData.id,
            name: attributionSourceData.name,
            url: attributionSourceData.url,
            logoUrl: attributionSourceData.logoUrl,
        } as RequiredEntityData<AttributionSource>)));
    }
}
