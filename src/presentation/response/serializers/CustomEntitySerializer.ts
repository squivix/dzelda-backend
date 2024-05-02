import {cleanObject} from "@/src/utils/utils.js";

export type CustomCallbackObject<T> = {
    [Key in keyof T]: () => T[Key];
};
export type IgnoreIncludeSerializedObject<I extends object, G extends (keyof I)[] | undefined = undefined, N extends (keyof I)[] | undefined = undefined> = N extends undefined ? (G extends undefined ? I : Omit<I, Exclude<G, undefined>[number]>) : Pick<I, Exclude<N, undefined>[number]>

export abstract class CustomEntitySerializer<T, I extends object> {
    serializeList<G extends (keyof I)[] | undefined = undefined, N extends (keyof I)[] | undefined = undefined>
    (entities: T[], {ignore, include}: {
        ignore?: G,
        include?: N
    } = {}): Array<IgnoreIncludeSerializedObject<I, G, N>> {
        const entityPojos: Array<IgnoreIncludeSerializedObject<I, G, N>> = [];
        for (const entity of entities) {
            const definition = this.definition(entity);

            const fieldsHidden: Partial<Record<keyof I, boolean>> = {};
            (ignore ?? []).forEach(h => fieldsHidden[h] = true);

            let pojo: Partial<I> = {};
            const fieldsIncluded = include == undefined ? Object.keys(definition) as Array<keyof I> : (Object.keys(definition) as Array<keyof I>).filter(f => include.includes(f));

            fieldsIncluded.forEach(k => {
                if (!fieldsHidden[k])
                    pojo[k] = (definition as CustomCallbackObject<I>)[k]();
            });
            entityPojos.push(cleanObject(pojo) as any);
        }
        return entityPojos;
    }

    serialize<G extends (keyof I)[] | undefined = undefined, N extends (keyof I)[] | undefined = undefined>
    (entity: T, {ignore, include}: {
        ignore?: G,
        include?: N
    } = {}): IgnoreIncludeSerializedObject<I, G, N> {
        const definition = this.definition(entity);

        const fieldsHidden: Partial<Record<keyof I, boolean>> = {};
        (ignore ?? []).forEach(h => fieldsHidden[h] = true);

        let pojo: Partial<I> = {};
        const fieldsIncluded = include == undefined ? Object.keys(definition) as Array<keyof I> : (Object.keys(definition) as Array<keyof I>).filter(f => include.includes(f));

        fieldsIncluded.forEach(k => {
            if (!fieldsHidden[k])
                pojo[k] = (definition as CustomCallbackObject<I>)[k]();
        });
        return cleanObject(pojo) as any;
    }


    abstract definition(entity: T): CustomCallbackObject<Partial<I>>;

}

