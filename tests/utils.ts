import cp from "child_process";
import {createCanvas} from "canvas";
import {faker} from "@faker-js/faker";

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

export function randomImage(width: number, height: number, mimeType: "image/png" | "image/jpeg" = "image/png") {
    const canvas = createCanvas(width, height);
    const canvasContext = canvas.getContext("2d");
    const imgData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = faker.datatype.number({min: 0, max: 255})
        imgData.data[i + 1] = faker.datatype.number({min: 0, max: 255})
        imgData.data[i + 2] = faker.datatype.number({min: 0, max: 255})
        imgData.data[i + 3] = 255; // alpha
    }
    canvasContext.putImageData(imgData, 0, 0);
    //typescript does not infer union types to overloaded functions. this is a workaround
    if (mimeType === "image/jpeg")
        return canvas.toBuffer("image/jpeg")
    else
        return canvas.toBuffer("image/png")
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