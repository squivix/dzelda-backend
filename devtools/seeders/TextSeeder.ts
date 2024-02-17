import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Text} from "@/src/models/entities/Text.js";
import {batchSeed, syncIdSequence} from "@/devtools/seeders/utils.js";
import {MapTextVocab} from "@/src/models/entities/MapTextVocab.js";
import path from "path";
import {DATASET_FILES} from "@/devtools/constants.js";

export class TextSeeder extends Seeder {
    async run(em: EntityManager, context: Dictionary): Promise<void> {
        const textsFilePath = path.join(context.databaseDumpPath, DATASET_FILES.text);
        const mapTextVocabsFilePath = path.join(context.databaseDumpPath, DATASET_FILES.mapTextVocab);

        if (!await fs.exists(textsFilePath)) {
            console.error(`${textsFilePath} not found`);
            return;
        }

        await batchSeed({
            filePath: textsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertTextsBatch(em, batch),
            postSeed: async () => await syncIdSequence(em, "text"),
            resourceName: "text",
        });


        await batchSeed({
            filePath: mapTextVocabsFilePath,
            batchSize: context.batchSize,
            insertBatch: (batch) => this.insertMapTextVocabsBatch(em, batch),
            resourceName: "text-vocab mappings",
        });
    }


    private async insertTextsBatch(em: EntityManager, batch: EntityData<Text>[]) {
        await em.insertMany(Text, batch.map(textData => ({
            id: textData.id,
            title: textData.title,
            content: textData.content,
            parsedTitle: textData.parsedTitle,
            parsedContent: textData.parsedContent,
            collection: textData.collection,
            isPublic: textData.isPublic,
            level: textData.level,
            addedBy: textData.addedBy,
            language: textData.language,
            orderInCollection: textData.orderInCollection,
            addedOn: textData.addedOn,
            audio: textData.audio,
            image: textData.image,
        })));
    }

    private async insertMapTextVocabsBatch(em: EntityManager, batch: EntityData<MapTextVocab>[]) {
        await em.insertMany(MapTextVocab, batch.map((mappingData) => ({
            text: mappingData.text,
            vocab: mappingData.vocab,
        })));
    }
}
