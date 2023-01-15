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
