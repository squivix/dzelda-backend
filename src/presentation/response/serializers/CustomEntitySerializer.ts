import {cleanObject} from "@/src/utils/utils.js";

export type CustomCallbackObject<T> = {
    [Key in keyof T]: () => T[Key];
};

export abstract class CustomEntitySerializer<T, I> {
    serializeList(entities: T[], {ignore = [], ...options}: { ignore?: (keyof I)[] } = {}): Partial<I>[] {
        return entities.map(e => this.serialize(e, {ignore: ignore, ...options}));
    }

    serialize(entity: T, {ignore}: { ignore: (keyof I)[] } = {ignore: []}): Partial<I> {
        const definition = this.definition(entity);

        const fieldsHidden: Partial<Record<keyof I, boolean>> = {};
        ignore.forEach(h => fieldsHidden[h] = true);

        let pojo: Partial<I> = {};
        (Object.keys(definition) as Array<keyof I>).forEach(k => {
            if (!fieldsHidden[k])
                pojo[k] = (definition as CustomCallbackObject<I>)[k]();
        });
        return cleanObject(pojo);
    }


    abstract definition(entity: T): CustomCallbackObject<Partial<I>>;

}

