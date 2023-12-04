import {open} from "node:fs/promises";
import {UniqueConstraintViolationException} from "@mikro-orm/core";

export function toCapitalizedCase(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function cleanObject<T extends Object>(obj: T) {
    (Object.keys(obj) as Array<keyof T>).forEach(function (key) {
        if (obj[key] === undefined)
            delete obj[key];
    });
    return obj;
}

//from https://stackoverflow.com/a/9310752/14200676
export function escapeRegExp(text: string) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

type Enum<E> = Record<keyof E, number | string> & { [k: number]: string };

export function numericEnumValues<E extends Enum<E>>(inputEnum: E): number[] {
    return Object.values(inputEnum).filter((v) => !isNaN(Number(v))).map(v => Number(v));
}


export async function countFileLines(filePath: string): Promise<number> {
    const fileHandle = await open(filePath);
    let count = 0;

    for await (const _ of fileHandle.readLines())
        count++;

    return count;
}

export function extractFieldFromUniqueConstraintError(error: UniqueConstraintViolationException) {
    //extracts column name from error message: "Key (column)=(value) already exists."
    //not ideal but seems like the only way
    return (error as UniqueConstraintViolationException & { detail: string }).detail.match(/\(([^)]*)\)/)?.pop();
}
