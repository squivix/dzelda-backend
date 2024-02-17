import {DATASET_FILES} from "@/devtools/constants.js";
import {EntityManager} from "@mikro-orm/core";
import {Collection} from "@/src/models/entities/Collection.js";
import {batchDump} from "@/devtools/dumpers/utils.js";
import path from "path";

export async function dumpCollections({em, batchSize, dataPath}: { em: EntityManager, batchSize: number, dataPath: string }) {
    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.collection),
        entityClass: Collection,
        resourceName: "collection",
        writeEntity: (collection: Collection) => ({
            id: collection.id,
            title: collection.title,
            description: collection.description,
            language: collection.language.id,
            addedBy: collection.addedBy.id,
            image: collection.image
        })
    })
}
