import {EntityRepository} from "@mikro-orm/postgresql";
import {defaultVocabsByLevel} from "dzelda-common";
import {Collection} from "@/src/models/entities/Collection.js";
import {User} from "@/src/models/entities/auth/User.js";

export class CollectionRepo extends EntityRepository<Collection> {

    async annotateCollectionsWithUserData(collections: Collection[], user: User) {
        await this.annotateVocabsByLevel(collections, user.profile.id);
        await this.annotateIsBookmarked(collections, user.profile.id);
    }

    private async annotateVocabsByLevel(collections: Collection[], learnerId: number) {
        if (collections.length === 0)
            return collections;
        const query = `SELECT json_object_agg(outq.id, outq.vocab_levels) AS vocab_levels_by_collection
FROM (SELECT subq.collection_id                          AS id,
             json_object_agg(COALESCE(subq.level, 0), subq.count) AS vocab_levels
      FROM (SELECT text.collection_id,
                   mlv2.level,
                   COUNT(*)
            FROM map_text_vocab mlv
                     LEFT JOIN map_learner_vocab mlv2 on mlv.vocab_id = mlv2.vocab_id AND mlv2.learner_id = ${learnerId}
                     LEFT JOIN text on mlv.text_id = text.id
            WHERE text.collection_id IN (${collections.map(c=>c.id).join(",")})
            GROUP BY text.collection_id, mlv2.level
            ORDER BY text.collection_id) AS subq
      GROUP BY subq.collection_id) as outq`;

        const vocabLevelsByCollection = (await this.em.execute(query))[0].vocab_levels_by_collection;
        const defaultCounts = defaultVocabsByLevel();
        collections.forEach(collection => collection.vocabsByLevel = Object.assign({}, defaultCounts, vocabLevelsByCollection?.[collection.id] ?? {}));
        return collections;
    }

    private async annotateIsBookmarked(collections: Collection[], learnerId: number) {
        if (collections.length === 0)
            return collections;
        const query = `SELECT json_object_agg(collection_id, true) AS collection_id_to_is_bookmarked FROM collection_bookmark WHERE bookmarker_id = ${learnerId};`;
        const collectionIdToIsBookmarked = (await this.em.execute(query))[0].collection_id_to_is_bookmarked;
        collections.forEach(collection => collection.isBookmarked = collectionIdToIsBookmarked?.[collection.id] ?? false);
        return collections;
    }

}
