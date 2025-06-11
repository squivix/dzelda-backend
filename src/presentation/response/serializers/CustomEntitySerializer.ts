import {cleanUndefined} from "dzelda-common";

export type CustomCallbackObject<T> = {
    [Key in keyof T]: (idOnly?: boolean) => T[Key];
};
export type IgnoreIncludeSerializedObject<I extends object, G extends (keyof I)[] | undefined = undefined, N extends (keyof I)[] | undefined = undefined> = N extends undefined ? (G extends undefined ? I : Omit<I, Exclude<G, undefined>[number]>) : Pick<I, Exclude<N, undefined>[number]>

export abstract class CustomEntitySerializer<T, I extends object> {
    serializeList<G extends (keyof I)[] | undefined = undefined, N extends (keyof I)[] | undefined = undefined>
    (entities: T[], {ignore, include, idOnlyFields}: {
        ignore?: G,
        include?: N,
        idOnlyFields?: (keyof I)[]
    } = {}): Array<IgnoreIncludeSerializedObject<I, G, N>> {
        const idOnlySet = new Set(idOnlyFields ?? []);
        const entityPojos: Array<IgnoreIncludeSerializedObject<I, G, N>> = [];
        for (const entity of entities) {
            const pojo = this.extractPojo(entity, ignore, include, idOnlySet);
            entityPojos.push(cleanUndefined(pojo));
        }
        return entityPojos;
    }

    serialize<G extends (keyof I)[] | undefined = undefined, N extends (keyof I)[] | undefined = undefined>
    (entity: T, {ignore, include, idOnlyFields}: {
        ignore?: G,
        include?: N,
        idOnlyFields?: (keyof I)[]
    } = {}): IgnoreIncludeSerializedObject<I, G, N> {
        const idOnlySet = new Set(idOnlyFields ?? []);
        const pojo = this.extractPojo(entity, ignore, include, idOnlySet);
        return cleanUndefined(pojo);
    }


    abstract definition(entity: T): CustomCallbackObject<Partial<I>>;

    private extractPojo<G extends (keyof I)[] | undefined = undefined, N extends (keyof I)[] | undefined = undefined>(entity: T, ignore: G, include: N, dontPopulateSet: Set<keyof I>) {
        const definition = this.definition(entity);

        const fieldsHidden: Partial<Record<keyof I, boolean>> = {};
        (ignore ?? []).forEach(h => fieldsHidden[h] = true);

        let pojo: Partial<I> = {};
        const fieldsIncluded = include == undefined ? Object.keys(definition) as Array<keyof I> : (Object.keys(definition) as Array<keyof I>).filter(f => include.includes(f));

        fieldsIncluded.forEach(k => {
            if (!fieldsHidden[k])
                pojo[k] = (definition as CustomCallbackObject<I>)[k](dontPopulateSet.has(k));
        });
        return pojo;
    }
}