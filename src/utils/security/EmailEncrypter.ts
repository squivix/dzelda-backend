import {AESEncrypter} from "@/src/utils/security/AESEncrypter.js";
import process from "process";

export const emailEncrypter = new AESEncrypter(process.env.EMAIL_AES_KEY_BASE_64!);
