import {EntityManager} from "@mikro-orm/core";
import {Language} from "@/src/models/entities/Language.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabRepo} from "@/src/models/repos/VocabRepo.js";

export class VocabService {
    em: EntityManager;
    vocabRepo: VocabRepo;

    constructor(em: EntityManager) {
        this.em = em;

        this.vocabRepo = this.em.getRepository(Vocab);
    }

    async createVocab(vocabData: { text: string; language: Language; isPhrase: boolean }) {
        const newVocab = await this.vocabRepo.create({
            text: vocabData.text,
            language: vocabData.language,
            isPhrase: vocabData.isPhrase
        });
        await this.em.flush();
        return newVocab;
    }

    async getVocabs(filters: {}, user: User | AnonymousUser | null) {
        let vocabs;
        if (user && !(user instanceof AnonymousUser)) {
            vocabs = await this.em.find(MapLearnerVocab, {}, {populate: ["vocab.meanings"]});
            await this.vocabRepo.annotateUserMeanings(vocabs, user.id);
        } else {
            vocabs = await this.vocabRepo.find(filters, {limit: 100, populate: ["meanings"]});
        }
        return vocabs;
    }
}