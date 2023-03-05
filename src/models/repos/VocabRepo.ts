import {EntityRepository} from "@mikro-orm/postgresql";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";

export class VocabRepo extends EntityRepository<Vocab> {

    async annotateUserMeanings(vocabMappings: MapLearnerVocab[], learnerId: number) {
        if (vocabMappings.length === 0)
            return vocabMappings;

        const query = `SELECT json_object_agg(outq.vocab_id, outq.user_meanings) AS user_meanings_by_vocab
FROM (SELECT subq.vocab_id, json_agg(subq.*) AS user_meanings
      FROM (SELECT meaning.*
            FROM meaning
                     LEFT JOIN map_learner_meaning mlm on meaning.id = mlm.meaning_id
            WHERE mlm.learner_id = ${learnerId}
              AND meaning.vocab_id IN (${vocabMappings.map(m=>m.vocab.id).join(",")})) subq
      GROUP BY subq.vocab_id) outq`;
        const userMeaningsByVocab = (await this.em.execute(query))[0].user_meanings_by_vocab ?? {};
        vocabMappings.forEach(vocabMapping => vocabMapping.userMeanings = userMeaningsByVocab[vocabMapping.vocab.id] ?? []);
    }

}