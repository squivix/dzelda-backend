import {Dictionary, EntityData, EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import fs from "fs-extra";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {MeaningFactory} from "@/src/seeders/factories/MeaningFactory.js";
import {syncIdSequence} from "@/src/seeders/utils.js";

export class MeaningSeeder extends Seeder {
    static readonly FILE_NAME = "meanings.json";

    async run(em: EntityManager, context: Dictionary): Promise<void> {
        if (!await fs.exists(`data/${MeaningSeeder.FILE_NAME}`))
            return;
        const meanings = await fs.readJSON(`data/${MeaningSeeder.FILE_NAME}`)
        const meaningFactory = new MeaningFactory(em)

        process.stdout.write("seeding meanings...");
        meanings.forEach((meaningData: EntityData<Meaning>) => {
            em.persist(meaningFactory.makeEntity({
                id: meaningData.id,
                text: meaningData.text,
                vocab: meaningData.vocab,
                addedBy: meaningData.addedBy,
                language: meaningData.language,
                addedOn: meaningData.addedOn,
                learners: meaningData.learners
            }))
        })
        await em.flush();
        await syncIdSequence(em, "meaning")
        console.log("done");
    }
}