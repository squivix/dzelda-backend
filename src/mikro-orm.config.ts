import {LoadStrategy, Options} from "@mikro-orm/core";
import {User} from "@/src/models/entities/auth/User.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Dictionary} from "@/src/models/entities/Dictionary.js";
import {MapTextVocab} from "@/src/models/entities/MapTextVocab.js";
import {TextHistoryEntry} from "@/src/models/entities/TextHistoryEntry.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerDictionary} from "@/src/models/entities/MapLearnerDictionary.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {Text} from "@/src/models/entities/Text.js";
import {Session} from "@/src/models/entities/auth/Session.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";
import {PasswordResetToken} from "@/src/models/entities/auth/PasswordResetToken.js";
import {EmailConfirmationToken} from "@/src/models/entities/auth/EmailConfirmationToken.js";
import {FileUploadRequest} from "@/src/models/entities/FileUploadRequest.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";
import {CollectionBookmark} from "@/src/models/entities/CollectionBookmark.js";
import {MapHiderText} from "@/src/models/entities/MapHiderText.js";
import {FlaggedTextReport} from "@/src/models/entities/FlaggedTextReport.js";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import {SeedManager} from "@mikro-orm/seeder";
import {Migrator} from "@mikro-orm/migrations";
import {TranslationLanguage} from "@/src/models/entities/TranslationLanguage.js";
import {PreferredTranslationLanguageEntry} from "@/src/models/entities/PreferredTranslationLanguageEntry.js";
import {VocabTag} from "@/src/models/entities/VocabTag.js";
import {MapVocabTag} from "@/src/models/entities/MapVocabTag.js";
import {MapVocabRootForm} from "@/src/models/entities/MapVocabRootForm.js";
import {VocabTagCategory} from "@/src/models/entities/VocabTagCategory.js";
import tr from "@faker-js/faker/locales/tr/index.js";


const devOptions: Options = {
    driver: PostgreSqlDriver,
    extensions: [Migrator, SeedManager],
    entities: [
        CustomBaseEntity, Collection, Dictionary, Language, Text, MapLearnerDictionary, CollectionBookmark,
        TextHistoryEntry, MapLearnerMeaning, MapLearnerVocab, MapTextVocab, MapLearnerLanguage, Meaning, Profile,
        Vocab, User, Session, PasswordResetToken, EmailConfirmationToken, FileUploadRequest, TTSVoice, TTSPronunciation,
        HumanPronunciation, MapHiderText, FlaggedTextReport, TranslationLanguage, PreferredTranslationLanguageEntry, VocabTag, VocabTagCategory, MapVocabTag, MapVocabRootForm
    ],
    loadStrategy: LoadStrategy.SELECT_IN,       //populateWhere does not work with JOINED, also to-many joins are slow
    debug: true,
    migrations: {
        path: "build/src/migrations",
        pathTs: "src/migrations",
    },
    seeder: {
        path: "build/devtools/seeders/",
        pathTs: "devtools/seeders/",
    },
    persistOnCreate: true
};

const testOptions: Options = {
    ...devOptions,
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
