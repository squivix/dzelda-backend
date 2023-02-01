export abstract class CustomEntitySerializer<T, I> {
    serializeList(entities: T[], {hiddenFields = [], ...options}: { hiddenFields?: (keyof I)[] } = {}): Partial<I>[] {
        return entities.map(e => this.serialize(e, {hiddenFields, ...options}));
    }

    abstract serialize(entity: T, {hiddenFields = [], ...options}: { hiddenFields?: (keyof I)[] }): Partial<I>;

}

