import * as dotenv from "dotenv";
import {LoadStrategy, Options} from "@mikro-orm/core";
import {User} from "@/src/models/entities/auth/User.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Course} from "@/src/models/entities/Course.js";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import {MapLearnerLesson} from "@/src/models/entities/MapLearnerLesson.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {DatabaseSeeder} from "@/src/seeders/DatabaseSeeder.js";

dotenv.config();

const devOptions: Options = {
    type: "postgresql",
    dbName: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    //entity discovery does not work so well with vitest, gotta pass manually :(
    entities: [Course, CustomBaseEntity, Dictionary, Language, Lesson, MapLearnerDictionary,
        MapLearnerLesson, MapLearnerMeaning, MapLearnerVocab, MapLessonVocab, MapLearnerLanguage, Meaning,
        Profile, Vocab, User, Session],
    // entities: ["./build/src/models/entities"],
    // entitiesTs: ["./src/models/entities"],
    loadStrategy: LoadStrategy.JOINED,
    debug: true,
    migrations: {
        path: "build/src/migrations",
        pathTs: "src/migrations",
    },
    seeder: {
        path: "build/src/seeders/",
        pathTs: "src/seeders/",
    }
};

const testOptions: Options = {
    ...devOptions,
    dbName: `${devOptions.dbName}-test`,
    debug: false,       //SQL queries too verbose
};

const prodOptions: Options = {
    ...devOptions,
    debug: false,
};

let options: Options;
if (process.env.NODE_ENV == "test")
    options = testOptions;
else if (process.env.NODE_ENV == "prod")
    options = prodOptions;
else
    options = devOptions;

export default options;