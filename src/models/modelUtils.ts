export function nestValueAtPath(path: string, value: unknown): { [key: string]: unknown } {
    const keys = path.split(".");
    const result: { [key: string]: any } = {};
    let current = result;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (i === keys.length - 1)
            current[key] = value;
        else {
            current[key] = {};
            current = current[key];
        }
    }

    return result;
}
