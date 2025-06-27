import {CustomBaseEntity} from "@/src/models/entities/CustomBaseEntity.js";
import {ViewDescription} from "@/src/models/viewResolver.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";
import process from "process";


export abstract class CustomSerializer<R extends CustomBaseEntity> {
    static readonly view: ViewDescription;

    abstract serialize(rootEntity: R, options: { assertNoUndefined: boolean }): any;

    protected finalizePojo<T extends Record<string, any>>(pojo: T, assertNoUndefined: boolean): T {
        if (assertNoUndefined && (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "dev"))
            assertNoUndefinedProps(pojo);
        return pojo;
    }

    serializeList(rootEntities: R[], {assertNoUndefined = false} = {}) {
        return rootEntities.map(e => this.serialize(e, {assertNoUndefined}));
    }
}
