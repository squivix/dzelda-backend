import crypto from "crypto";
import {promisify} from "util";

const pbkdf2Async = promisify(crypto.pbkdf2);

class PKDF2Hasher implements PasswordHasher {
    iterations!: number;
    keyLength!: number;
    saltLength!: number;
    digest!: string;

    async hash(plainText: string): Promise<string> {
        const salt = crypto.randomBytes(this.saltLength);
        const hash = await pbkdf2Async(plainText, salt, this.iterations, this.keyLength, this.digest,);
        return hash.toString("base64");
    }

    async validate(plainText: string, hash: string, salt: string): Promise<boolean> {
        const plainTextHash = await pbkdf2Async(plainText, salt, this.iterations, this.keyLength, this.digest,);
        return plainTextHash.toString("base64") === hash;
    }

}