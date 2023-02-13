import {EntityManager, EntityRepository} from "@mikro-orm/core";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {Language} from "@/src/models/entities/Language.js";
import {User} from "@/src/models/entities/auth/User.js";

export class MeaningService {

    em: EntityManager;
    meaningRepo: EntityRepository<Meaning>;

    constructor(em: EntityManager) {
        this.em = em;

        this.meaningRepo = this.em.getRepository(Meaning);
    }

    async getMeaningByText(meaningData: { vocab: Vocab; language: Language; text: string }) {
        return await this.meaningRepo.findOne({
            vocab: meaningData.vocab,
            text: meaningData.text,
            language: meaningData.language
        }, {populate: []});
    }

    async createMeaning(meaningData: { vocab: Vocab; language: Language; text: string }, user: User) {
        const newMeaning = await this.meaningRepo.create({
            text: meaningData.text,
            language: meaningData.language,
            vocab: meaningData.vocab,
            addedBy: user.profile
        });
        await this.em.flush();
        return newMeaning;
    }
}