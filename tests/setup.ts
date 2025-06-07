import {afterAll, beforeEach, TestContext, vi} from "vitest";
import {orm} from "@/src/server.js";
import {UserFactory} from "@/devtools/factories/UserFactory.js";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {SessionFactory} from "@/devtools/factories/SessionFactory.js";
import {LanguageFactory} from "@/devtools/factories/LanguageFactory.js";
import {TextFactory} from "@/devtools/factories/TextFactory.js";
import {CollectionFactory} from "@/devtools/factories/CollectionFactory.js";
import {DictionaryFactory} from "@/devtools/factories/DictionaryFactory.js";
import {VocabFactory} from "@/devtools/factories/VocabFactory.js";
import {MeaningFactory} from "@/devtools/factories/MeaningFactory.js";
import {FileUploadRequestFactory} from "@/devtools/factories/FileUploadRequestFactory.js";
import {Text} from "@/src/models/entities/Text.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {TranslationLanguageFactory} from "@/devtools/factories/TranslationLanguageFactory.js";
import {parsers} from "dzelda-common";
import {NotificationFactory} from "@/devtools/factories/NotificationFactory";
import {PendingJobFactory} from "@/devtools/factories/PendingJobFactory";
import {HumanPronunciationFactory} from "@/devtools/factories/HumanPronunciationFactory";

vi.mock("dzelda-common", async () => {
    return {
        ...(await vi.importActual("dzelda-common") as any),
        getParser: vi.fn(() => parsers["en"])
    };
});
beforeEach(async (context: TestContext) => {
    await orm.getSchemaGenerator().clearDatabase();
    context.em = orm.em.fork();

    //factories
    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.translationLanguageFactory = new TranslationLanguageFactory(context.em);
    context.collectionFactory = new CollectionFactory(context.em);
    context.textFactory = new TextFactory(context.em);
    context.dictionaryFactory = new DictionaryFactory(context.em);
    context.vocabFactory = new VocabFactory(context.em);
    context.meaningFactory = new MeaningFactory(context.em);
    context.fileUploadRequestFactory = new FileUploadRequestFactory(context.em);
    context.notificationFactory = new NotificationFactory(context.em);
    context.pendingJobFactory = new PendingJobFactory(context.em);
    context.humanPronunciationFactory = new HumanPronunciationFactory(context.em);
    //repos
    context.collectionRepo = context.em.getRepository(Collection);
    context.textRepo = context.em.getRepository(Text);
    context.vocabRepo = context.em.getRepository(Vocab);
    context.meaningRepo = context.em.getRepository(Meaning);
});
afterAll(async () => {
    await orm.close(true);
});
