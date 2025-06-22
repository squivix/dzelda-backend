export abstract class CustomDTO<R> {
    serialize(rootEntity: R): any {

    }

    serializeList(rootEntities: R[]) {
        return rootEntities.map(e => this.serialize(e));
    }
}