declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV?: "dev" | "test" | "prod" | string;
            PORT?: string;
            MIKRO_ORM_CLIENT_URL?: string;
            EMAIL_SERVER_HOST?: string;
            EMAIL_SERVER_PORT?: string;
            SPACES_ACCESS_KEY?: string;
            SPACES_SECRET_KEY?: string;
            SPACES_ENDPOINT?: string;
            SPACES_BUCKET?: string;
            SPACES_REGION?: string;
        }
    }
}

export {};
