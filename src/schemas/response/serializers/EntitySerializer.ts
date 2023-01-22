export abstract class CustomEntitySerializer<T, I> {
    serializeList(entities: T[], {
        mode = SerializationMode.LIST,
        hiddenFields = []
    }: { mode?: SerializationMode, hiddenFields?: (keyof I)[] } = {}): I[] {
        return entities.map(e => this.serialize(e, {mode, hiddenFields}));
    }

    abstract serialize(entity: T, {mode, hiddenFields}: { mode?: SerializationMode, hiddenFields?: (keyof I)[] }): I
}


export enum SerializationMode {
    LIST = "List",
    DETAIL = "Detail"
}