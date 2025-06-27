import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {ViewDescription} from "@/src/models/viewResolver.js";


export abstract class CustomSerializer<R extends CustomBaseEntity> {
    static readonly view: ViewDescription;

    abstract serialize(rootEntity: R, options: { assertNoUndefined: boolean }): any;

    serializeList(rootEntities: R[], {assertNoUndefined = false} = {}) {
        return rootEntities.map(e => this.serialize(e, {assertNoUndefined}));
    }
}