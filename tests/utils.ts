import cp from "child_process";

export function truncateDb() {
    cp.execSync(`${process.env.PWD}/scripts/truncate-test-db.sh`);
}

//from https://stackoverflow.com/a/55699349/14200676
export function randomEnum(enumeration: any) {
    const values = Object.keys(enumeration);
    const enumKey = values[Math.floor(Math.random() * values.length)];
    return enumeration[enumKey];
}

export function randomCase(val: string) {
    return val.toLowerCase().split('').map(function (c) {
        return Math.random() < .5 ? c : c.toUpperCase();
    }).join('');
}
