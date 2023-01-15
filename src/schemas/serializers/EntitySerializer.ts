export abstract class CustomEntitySerializer<T> {
    serializeList(entities: T[], mode: SerializationMode = SerializationMode.LIST) {
        return entities.map(e => this.serialize(e, mode));
    }

    abstract serialize(entity: T, mode: SerializationMode): Object
}


export enum SerializationMode {
    LIST = "List",
    DETAIL = "Detail"
}