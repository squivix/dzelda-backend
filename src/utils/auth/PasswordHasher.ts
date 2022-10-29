interface PasswordHasher {
    hash(plainText: String): Promise<string>;

    validate(plainText: string, cipherText: string): Promise<boolean>;
}