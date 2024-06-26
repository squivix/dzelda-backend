import {mebiBytes} from "dzelda-common";

export const fileFields = {
    collectionImage: {
        path: "uploads/collections/images",
        extensions: [".jpg", ".jpeg", ".png"],
        minSize: 1,
        maxSize: mebiBytes(1)
    },
    textImage: {
        path: "uploads/texts/images",
        extensions: [".jpg", ".jpeg", ".png"],
        minSize: 1,
        maxSize: mebiBytes(1)
    },
    textAudio: {
        path: "uploads/texts/audio",
        extensions: [".mp3", ".m4a"],
        minSize: 1,
        maxSize: mebiBytes(100)
    },
    profilePicture: {
        path: "uploads/profiles/pictures",
        extensions: [".jpg", ".jpeg", ".png"],
        minSize: 1,
        maxSize: mebiBytes(1)
    }
};
export type FileFieldType = typeof fileFields;
export const fileFieldsKeys = Object.keys(fileFields);
