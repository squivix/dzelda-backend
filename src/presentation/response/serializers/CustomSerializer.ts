export abstract class CustomSerializer<R> {
    serialize(rootEntity: R): any {

    }

    serializeList(rootEntities: R[]) {
        return rootEntities.map(e => this.serialize(e));
    }
}