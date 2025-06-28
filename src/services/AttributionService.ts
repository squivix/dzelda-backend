import {EntityManager} from "@mikro-orm/core";
import {AttributionSource} from "@/src/models/entities/AttributionSource.js";
import {buildFetchPlan, ViewDescription} from "@/src/models/viewResolver.js";
import {attributionSourceFieldFetchMap} from "@/src/models/fetchSpecs/attributionSourceFieldFetchMap.js";

export class AttributionService {

    em: EntityManager;

    constructor(em: EntityManager) {
        this.em = em;
    }

    async getAttributionSource(attributionSourceId: number, viewDescription: ViewDescription) {
        const {fields, populate} = buildFetchPlan(viewDescription, attributionSourceFieldFetchMap, {user: null, em: this.em});
        return this.em.findOne(AttributionSource, {id: attributionSourceId}, {
            fields: fields as any,
            populate: populate as any
        })
    }
}
