export function assertNoUndefinedProps(obj: Record<string, any>): void {
    for (const key in obj) {
        if (obj[key] === undefined) {
            throw new Error(`Property '${key}' is undefined`);
        }
    }
}
