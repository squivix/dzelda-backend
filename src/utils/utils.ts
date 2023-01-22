import {z, ZodRawShape} from "zod";

export function toCapitalizedCase(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function cleanObject(obj: { [x: string | number | symbol]: unknown; }) {
    Object.keys(obj).forEach(function (key) {
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
    return Object.values(inputEnum).filter((v) => !isNaN(Number(v))).map(v => Number(v))
}

export function parseIgnoreInvalidFields<T extends ZodRawShape>(validator: z.ZodObject<T>, value: Record<string, any>) {
    Object.keys(validator.shape).forEach(k => {
        const result = validator.shape[k].safeParse(value?.[k]);
        if (!result.success)
            delete value?.[k];
    })
    return validator.parse(value);
}