import crypto from "crypto";
import {promisify} from "util";
import {resolveSrv} from "dns";

const pbkdf2Async = promisify(crypto.pbkdf2);

export class PKDF2Hasher implements PasswordHasher {
    keyLength!: number;
    saltLength!: number;
    iterations!: number;
    digest!: string;

    get NAME() {
        return `pkdf2_${this.digest}`;
    }


    get FORMAT() {
        return `${this.NAME}$iterations$hash$salt}`;
    }

    private format(hash: string, salt: string): string {
        return `${this.NAME}$${this.iterations}$${hash}$${salt}`;
    }

    private deFormat(cipherText: string) {
        const dbValues = cipherText.split("$");
        return {iterations: Number(dbValues [1]), hash: dbValues [2], salt: dbValues [3]};
    }

    constructor(iterations: number = 500_000, keyLength: number = 32, saltLength: number = 16, digest: string = "sha256") {
        this.iterations = iterations;
        this.keyLength = keyLength;
        this.saltLength = saltLength;
        this.digest = digest;
    }

    async hash(plainText: string): Promise<string> {
        const salt = crypto.randomBytes(this.saltLength);
        const hash = await pbkdf2Async(plainText, salt, this.iterations, this.keyLength, this.digest);
        return this.format(hash.toString("base64"), salt.toString("base64"));
    }

    async validate(plainText: string, cipherText: string): Promise<boolean> {
        const {hash, salt, iterations} = this.deFormat(cipherText);
        const plainTextHash = await pbkdf2Async(plainText, salt, iterations, this.keyLength, this.digest);
        return plainTextHash.toString("base64") === hash;
    }

}