interface PasswordHasher {
    hash(plainText: String): Promise<string>;

    validate(plainText: string, hash: string, salt: string): Promise<boolean>;
}