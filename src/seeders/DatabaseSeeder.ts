import {Seeder} from "@mikro-orm/seeder";
import {EntityManager} from "@mikro-orm/core";
import {UserSeeder} from "@/src/seeders/UserSeeder.js";
import {LanguageSeeder} from "@/src/seeders/LanguageSeeder.js";
import {CourseSeeder} from "@/src/seeders/CourseSeeder.js";
import {LessonSeeder} from "@/src/seeders/LessonSeeder.js";
import {VocabSeeder} from "@/src/seeders/VocabSeeder.js";
import {MeaningSeeder} from "@/src/seeders/MeaningSeeder.js";
import {DictionarySeeder} from "@/src/seeders/DictionarySeeder.js";

export class DatabaseSeeder extends Seeder {
    run(em: EntityManager): Promise<void> {

        return this.call(em, [          //order is important
            UserSeeder,
            LanguageSeeder,
            DictionarySeeder,
            CourseSeeder,
            VocabSeeder,
            // LessonSeeder,
            // MeaningSeeder,
        ]);
    }
}