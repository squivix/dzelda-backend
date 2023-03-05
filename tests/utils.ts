import cp from "child_process";

export function truncateDb() {
    cp.execSync(`${process.env.PWD}/scripts/truncate-test-db.sh`);
}


function randomNumericEnum<T extends Record<string, any>>(e: T): number {
    const values = Object.values(e);
    const numericValues = values.filter((value) => typeof value === "number");
    const randomIndex = Math.floor(Math.random() * numericValues.length);
    return numericValues[randomIndex];
}

function randomNonNumericEnum<T extends Record<string, any>>(e: T): string {
    const values = Object.values(e);
    const randomIndex = Math.floor(Math.random() * values.length);
    return values[randomIndex];
}

// TypeScript's implementation of numeric enums makes reliably detecting enum type or picking a random enum value hard :(
export function randomEnum<T extends Record<string, number | string>>(e: T): T[keyof T] {
    const values = Object.values(e);
    const numericCount = values.filter((value) => typeof value === "number").length;
    if (numericCount === values.length / 2)
        return randomNumericEnum(e) as T[keyof T];
    else
        return randomNonNumericEnum(e) as T[keyof T];
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

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));