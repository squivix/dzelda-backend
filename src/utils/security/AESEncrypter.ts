import crypto from "crypto";


export class AESEncrypter {
    key;
    readonly ALGORITHM = "aes-256-gcm";
    readonly FORMAT = "algorithm$iv$authTag$cipherText";

    constructor(key: string) {
        this.key = Buffer.from(key, "base64");
    }

    encrypt(plainText: string) {
        const iv = Buffer.from(crypto.randomBytes(12));
        const cipher = crypto.createCipheriv(this.ALGORITHM, this.key, iv);
        let cipherText = cipher.update(plainText, "utf8", "base64");
        cipherText += cipher.final("base64");
        return [this.ALGORITHM, iv.toString("base64"), cipher.getAuthTag().toString("base64"), cipherText].join("$");
    }

    decrypt(encrypted: string) {
        const [algorithm, ivBase64, authTagBase64, cipherTextBase64] = encrypted.split("$");
        if (algorithm !== this.ALGORITHM)
            throw Error("Algorithm not matching");
        const iv = Buffer.from(ivBase64, "base64");
        const authTag = Buffer.from(authTagBase64, "base64");
        const decipher = crypto.createDecipheriv(this.ALGORITHM, this.key, iv);
        decipher.setAuthTag(authTag);
        let str = decipher.update(cipherTextBase64, "base64", "utf8");
        str += decipher.final("utf8");
        return str;
    }
}
