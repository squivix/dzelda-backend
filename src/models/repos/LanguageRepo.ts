import {EntityRepository} from "@mikro-orm/postgresql";
import {Language} from "@/src/models/entities/Language.js";
import {MapLearnerLanguage} from "@/src/models/entities/MapLearnerLanguage.js";

export class LanguageRepo extends EntityRepository<Language> {
    async updateUserLanguageTimeStamp(mapping: MapLearnerLanguage) {
        const query = `UPDATE map_learner_language SET last_opened = now() WHERE id = ${mapping.id} RETURNING *`

        const result = await this.em.execute(query)
        return this.em.map(MapLearnerLanguage, result[0])
    }

}