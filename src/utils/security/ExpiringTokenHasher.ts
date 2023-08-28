import crypto from "node:crypto";

class ExpiringTokenHasher {

    async hash(plainText: string | Buffer): Promise<string> {
        return crypto.createHash("sha256").update(plainText).digest("hex");
    }

    async validate(plainText: string, hash: string): Promise<boolean> {
        return crypto.createHash("sha256").update(plainText).digest("hex") == hash;
    }

}

export const expiringTokenHasher = new ExpiringTokenHasher();
