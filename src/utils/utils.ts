export function toCapitalizedCase(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function cleanObject(obj: { [key: string]: any }) {
    Object.keys(obj).forEach(function (key) {
        if (typeof (obj[key] as any) === "undefined")
            delete obj[key];
    });
    return obj;
}