import {EntityManager, EntityRepository} from "@mikro-orm/core";
import {UserFactory} from "@/devtools/factories/UserFactory.js";
import {ProfileFactory} from "@/devtools/factories/ProfileFactory.js";
import {SessionFactory} from "@/devtools/factories/SessionFactory.js";
import {CollectionRepo} from "@/src/models/repos/CollectionRepo.js";
import {TextRepo} from "@/src/models/repos/TextRepo.js";
import {LanguageFactory} from "@/devtools/factories/LanguageFactory.js";
import {CollectionFactory} from "@/devtools/factories/CollectionFactory.js";
import {TextFactory} from "@/devtools/factories/TextFactory.js";
import {FileUploadRequestFactory} from "@/devtools/factories/FileUploadRequestFactory.js";
import {DictionaryFactory} from "@/devtools/factories/DictionaryFactory.js";
import {VocabFactory} from "@/devtools/factories/VocabFactory.js";
import {MeaningFactory} from "@/devtools/factories/MeaningFactory.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {VocabRepo} from "@/src/models/repos/VocabRepo.js";
import {TranslationLanguageFactory} from "@/devtools/factories/TranslationLanguageFactory.js";
import {NotificationFactory} from "@/devtools/factories/NotificationFactory";

declare module "vitest" {
    export interface TestContext {
        em: EntityManager;
        //factories
        userFactory: UserFactory;
        profileFactory: ProfileFactory;
        sessionFactory: SessionFactory;
        languageFactory: LanguageFactory;
        translationLanguageFactory: TranslationLanguageFactory;
        collectionFactory: CollectionFactory;
        textFactory: TextFactory;
        fileUploadRequestFactory: FileUploadRequestFactory;
        dictionaryFactory: DictionaryFactory;
        vocabFactory: VocabFactory;
        meaningFactory: MeaningFactory;
        notificationFactory: NotificationFactory;
        pendingJobFactory: PendingJobFactory;

        //repos
        collectionRepo: CollectionRepo;
        textRepo: TextRepo;
        vocabRepo: VocabRepo;
        meaningRepo: EntityRepository<Meaning>;
    }
}
