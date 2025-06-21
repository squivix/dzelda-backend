export abstract class CustomDTO<R> {
    abstract serialize(rootEntity: R): any;

    serializeList(rootEntities: R[]) {
        return rootEntities.map(e => this.serialize(e));
    }
}