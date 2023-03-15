import {cleanObject} from "@/src/utils/utils.js";

export type CustomCallbackObject<T> = {
    [Key in keyof T]: () => T[Key];
};

export abstract class CustomEntitySerializer<T, I> {
    serializeList(entities: T[], {
        ignore = [],
        include,
        ...options
    }: { ignore: (keyof I)[], include?: (keyof I)[] } = {ignore: []}): Partial<I>[] {
        return entities.map(e => this.serialize(e, {ignore: ignore, ...options}));
    }

    serialize(entity: T, {ignore = [], include}: { ignore?: (keyof I)[], include?: (keyof I)[] } = {ignore: []}): Partial<I> {
        const definition = this.definition(entity);

        const fieldsHidden: Partial<Record<keyof I, boolean>> = {};
        ignore.forEach(h => fieldsHidden[h] = true);

        let pojo: Partial<I> = {};
        const fieldsIncluded = include == undefined ? Object.keys(definition) as Array<keyof I> : (Object.keys(definition) as Array<keyof I>).filter(f => include.includes(f));

        fieldsIncluded.forEach(k => {
            if (!fieldsHidden[k])
                pojo[k] = (definition as CustomCallbackObject<I>)[k]();
        });
        return cleanObject(pojo);
    }


    abstract definition(entity: T): CustomCallbackObject<Partial<I>>;

}

