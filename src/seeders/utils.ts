import {EntityManager} from "@mikro-orm/core";
import {SqlEntityManager} from "@mikro-orm/postgresql";

export async function syncIdSequence(em: EntityManager, tableName: string) {
    await (em as SqlEntityManager).execute(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), coalesce(max(id),0) + 1, false) FROM "${tableName}"`)
}

