declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV?: "dev" | "test" | "prod" | string;
            PORT?: string;
            MIKRO_ORM_CLIENT_URL?: string;
            SMTP_HOST?: string;
            SMTP_PORT?: string;
            SMTP_USERNAME?: string;
            SMTP_PASSWORD?: string;
            SPACES_ACCESS_KEY?: string;
            SPACES_SECRET_KEY?: string;
            SPACES_ENDPOINT?: string;
            SPACES_CDN_ENDPOINT?: string;
            SPACES_BUCKET?: string;
            SPACES_REGION?: string;
            DB_SSL_CA_CERT_PATH?: string;
            RABBITMQ_CONNECTION_URL?:string;
        }
    }
}

export {};
