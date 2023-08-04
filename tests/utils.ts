function randomNumericEnum<T extends Record<string, any>>(e: T, exclude?: number[]): number {
    const values = Object.values(e);
    const numericValues = values.filter((value) => typeof value === "number");
    const filteredValues = exclude ? numericValues.filter((value) => !exclude.includes(value)) : numericValues;
    const randomIndex = Math.floor(Math.random() * filteredValues.length);
    return filteredValues[randomIndex];
}

function randomNonNumericEnum<T extends Record<string, any>>(e: T, exclude?: string[]): string {
    const values = Object.values(e);
    const filteredValues = exclude ? values.filter((value) => !exclude.includes(value)) : values;
    const randomIndex = Math.floor(Math.random() * filteredValues.length);
    return filteredValues[randomIndex];
}

// TypeScript's garbage implementation of numeric enums makes reliably detecting enum type or picking a random enum value hard :(
// Note this function fails if an enum includes a mix of numeric and non-numeric values as it will treat it as non-numeric and return a key as a value
export function randomEnum<T extends Record<string, number | string>>(e: T, exclude?: (number | string)[]): T[keyof T] {
    const values = Object.values(e);
    const numericCount = values.filter((value) => typeof value === "number").length;
    if (numericCount === values.length / 2)
        return randomNumericEnum(e, exclude as number[]) as T[keyof T];
    else
        return randomNonNumericEnum(e, exclude as string[]) as T[keyof T];
}

export function randomEnums<T extends Record<string, number | string>>(count: number, e: T, exclude?: (number | string)[]): T[keyof T][] {
    const values = Object.values(e);
    const numericCount = values.filter((value) => typeof value === "number").length;
    const numberOfElements = numericCount === values.length / 2 ? numericCount : values.length
    // if count is more than number of elements return randomEnums with no replacement
    if (count > (numberOfElements - (exclude?.length ?? 0)))
        return [...Array(count)].map(() => randomEnum(e, exclude));
    const enumsList: T[keyof T][] = [];
    for (let i = 0; i < count; i++) {
        const next = randomEnum(e, [...exclude ?? [], ...enumsList]);
        enumsList.push(next)
    }
    return enumsList;
}


export function randomCase(val: string) {
    return val.toLowerCase().split("").map(function (c) {
        return Math.random() < .5 ? c : c.toUpperCase();
    }).join("");
}

//from https://stackoverflow.com/a/2450976/14200676
export function shuffleArray<T>(array: T[]) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
}

export function areSetsEqual(set1: Set<any>, set2: Set<any>) {
    return set1.size === set2.size && [...set1].every((x) => set2.has(x));
}
