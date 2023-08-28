import bcrypt from "bcrypt";

class PasswordHasher {

    async hash(plainText: string): Promise<string> {
        return await bcrypt.hash(plainText, 13);
    }

    async validate(plainText: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(plainText, hash);
    }

}

export const passwordHasher = new PasswordHasher();
