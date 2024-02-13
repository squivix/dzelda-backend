import {kibiBytes, mebiBytes} from "@/tests/integration/utils.js";

export const fileFields = {
    courseImage: {
        path: "uploads/courses/images",
        extensions: [".jpg", ".jpeg", ".png"],
        minSize: 1,
        maxSize: kibiBytes(500)
    },
    lessonImage: {
        path: "uploads/lessons/images",
        extensions: [".jpg", ".jpeg", ".png"],
        minSize: 1,
        maxSize: kibiBytes(500)
    },
    lessonAudio: {
        path: "uploads/lessons/audio",
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
