export abstract class CustomEntitySerializer<T, I> {
    serializeList(entities: T[], {ignore = [], ...options}: { ignore?: (keyof I)[] } = {}): Partial<I>[] {
        return entities.map(e => this.serialize(e, {ignore: ignore, ...options}));
    }

    abstract serialize(entity: T, {ignore = [], ...options}: { ignore?: (keyof I)[] }): Partial<I>;

}

