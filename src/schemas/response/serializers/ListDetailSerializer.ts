import {cleanObject} from "@/src/utils/utils.js";
import {CustomEntitySerializer} from "@/src/schemas/response/serializers/CustomEntitySerializer.js";

export type CustomCallbackObject<T> = {
    [Key in keyof T]: () => T[Key];
};

export abstract class ListDetailSerializer<T, L, D> extends CustomEntitySerializer<T, L | D> {
    serializeList(entities: T[], {
        mode = SerializationMode.LIST,
        hiddenFields = []
    }: { mode?: SerializationMode, hiddenFields?: (keyof (L | D))[] } = {}): Partial<L | D>[] {
        return entities.map(e => this.serialize(e, {mode, hiddenFields}));
    }

    serialize(entity: T, {
        mode = SerializationMode.DETAIL,
        hiddenFields = []
    }: { mode?: SerializationMode, hiddenFields?: (keyof L | keyof D)[] } = {}) {
        let definition: CustomCallbackObject<L> | CustomCallbackObject<D>;
        if (mode === SerializationMode.LIST)
            definition = this.listDefinition(entity);
        else
            definition = this.detailDefinition(entity);

        const fieldsHidden: Partial<Record<(keyof L) | (keyof D), boolean>> = {};
        hiddenFields.forEach(h => fieldsHidden[h] = true);

        //repetitive code because I don't understand union types :(
        if (mode === SerializationMode.LIST) {
            let pojo: Partial<L> = {};
            (Object.keys(definition) as Array<keyof L>).forEach(k => {
                if (!fieldsHidden[k])
                    pojo[k] = (definition as CustomCallbackObject<L>)[k]();
            })
            return cleanObject(pojo);
        } else {
            let pojo: Partial<D> = {};
            (Object.keys(definition) as Array<keyof D>).forEach(k => {
                if (!fieldsHidden[k])
                    pojo[k] = (definition as CustomCallbackObject<D>)[k]();
            })
            return cleanObject(pojo);
        }
    }

    abstract listDefinition(entity: T): CustomCallbackObject<L>;

    abstract detailDefinition(entity: T): CustomCallbackObject<D>;

}


export enum SerializationMode {
    LIST = "List",
    DETAIL = "Detail"
}