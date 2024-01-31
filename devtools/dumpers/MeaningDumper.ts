import {EntityManager} from "@mikro-orm/core";
import {batchDump} from "@/devtools/dumpers/utils.js";
import path from "path";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {DATASET_FILES} from "@/devtools/constants.js";

export async function dumpMeanings({em, batchSize, dataPath}: { em: EntityManager, batchSize: number, dataPath: string }) {
    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.meaning),
        entityClass: Meaning,
        resourceName: "meaning",
        writeEntity: (meaning: Meaning) => ({
            id: meaning.id,
            text: meaning.text,
            vocab: meaning.vocab.id,
            addedBy: meaning.addedBy?.id,
            language: meaning.language.id,
            addedOn: meaning.addedOn,
            attributionMarkdownText: meaning.attributionMarkdownText,
            attributionLogo: meaning.attributionLogo,
        })
    });

    await batchDump({
        em, batchSize,
        filePath: path.join(dataPath, DATASET_FILES.mapLearnerMeaning),
        entityClass: MapLearnerMeaning,
        resourceName: "learner-meaning mappings",
        writeEntity: (mapping: MapLearnerMeaning) => ({
            learner: mapping.learner.id,
            meaning: mapping.meaning.id,
        })
    });
}
