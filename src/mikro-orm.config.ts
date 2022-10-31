import * as dotenv from "dotenv";

dotenv.config();
import {LoadStrategy, Options} from "@mikro-orm/core";
import {User} from "./models/entities/auth/User.js";
import {Profile} from "./models/entities/Profile.js";
import {Course} from "./models/entities/Course.js";
import {CustomBaseEntity} from "./models/entities/CustomBaseEntity.js";
import {Meaning} from "./models/entities/Meaning.js";
import {Dictionary} from "./models/entities/Dictionary.js";
import {MapLessonVocab} from "./models/entities/MapLessonVocab.js";
import {MapLearnerLesson} from "./models/entities/MapLearnerLesson.js";
import {MapLearnerMeaning} from "./models/entities/MapLearnerMeaning.js";
import {Language} from "./models/entities/Language.js";
import {MapLearnerDictionary} from "./models/entities/MapLearnerDictionary.js";
import {MapLearnerVocab} from "./models/entities/MapLearnerVocab.js";
import {Lesson} from "./models/entities/Lesson.js";
import {Session} from "./models/entities/auth/Session.js";
import {Vocab} from "./models/entities/Vocab.js";
import {MapLearnerLanguage} from "./models/entities/MapLearnerLanguage.js";

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
};

const testOptions: Options = {
    ...devOptions,
    dbName: `${devOptions.dbName}-test`,
    debug: true,
};

const prodOptions: Options = {
    ...devOptions,
    debug: false,
};

let options: Options;
if (process.env.ENVIRONMENT == "test")
    options = testOptions;
else if (process.env.ENVIRONMENT == "prod")
    options = prodOptions;
else
    options = devOptions;

export default options;