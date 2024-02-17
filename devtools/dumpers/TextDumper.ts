import {EntityManager} from "@mikro-orm/core";
import {batchDump} from "@/devtools/dumpers/utils.js";
import path from "path";
import {Text} from "@/src/models/entities/Text.js";
import {MapTextVocab} from "@/src/models/entities/MapTextVocab.js";
import {DATASET_FILES} from "@/devtools/constants.js";

export async function dumpTexts({em, batchSize, dataPath}: { em: EntityManager, batchSize: number, dataPath: string }) {
    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.text),
        entityClass: Text,
        resourceName: "text",
        writeEntity: (text: Text) => ({
            id: text.id,
            title: text.title,
            content: text.content,
            parsedTitle: text.parsedTitle,
            parsedContent: text.parsedContent,
            collection: text.collection?.id,
            orderInCollection: text.orderInCollection,
            addedOn: text.addedOn,
            audio: text.audio,
            image: text.image,
        })
    });

    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.mapTextVocab),
        entityClass: MapTextVocab,
        resourceName: "text-vocab mappings",
        writeEntity: (mapping: MapTextVocab) => ({
            text: mapping.text.id,
            vocab: mapping.vocab.id
        })
    });
}
