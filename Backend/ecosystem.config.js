module.exports = {
    apps: [
        {
            name: 'gateway-service',
            script: './gateway-service/src/index.js', // Path to the entry file of your gateway service
            watch: true,
            env: {
                NODE_ENV: 'development',
                PORT: 4000, // Gateway's port
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 4000, // Gateway's port in production (commonly 80)
            },
        },
        {
            name: 'auth-service',
            script: './auth-service/src/index.js', // Path to the entry file of the auth-service
            watch: true,
            env: {
                NODE_ENV: 'production',
                DB_HOST: 'localhost',
                DB_USER: 'postgres',
                DB_PASS: 'admin123',
                DB_NAME: 'dream',
                DB_PORT: '5432',
                JWT_SECRET: 'Dream_jwt_secret',
                REFRESH_SECRET: 'Dream_refresh_secret',
            },
            env_production: {
                NODE_ENV: 'production',
                DB_HOST: 'localhost',
                DB_USER: 'postgres',
                DB_PASS: 'admin123',
                DB_NAME: 'dream',
                DB_PORT: '5432',
                JWT_SECRET: 'Dream_jwt_secret',
                REFRESH_SECRET: 'Dream_refresh_secret',
            },
        },
        {
            name: 'dispute-service',
            script: './dispute-service/src/index.js', // Path to the entry file of the dispute-service
            watch: true,
            env: {
                NODE_ENV: 'development',
                DB_HOST: 'localhost',
                DB_USER: 'postgres',
                DB_PASS: 'admin123',
                DB_NAME: 'dream',
                DB_PORT: '5432',
                JWT_SECRET: 'Dream_jwt_secret',
                REFRESH_SECRET: 'Dream_refresh_secret',
            },
            env_production: {
                NODE_ENV: 'production',
                DB_HOST: 'localhost',
                DB_USER: 'postgres',
                DB_PASS: 'admin123',
                DB_NAME: 'dream',
                DB_PORT: '5432',
                JWT_SECRET: 'Dream_jwt_secret',
                REFRESH_SECRET: 'Dream_refresh_secret',
            },
        },
        {
            name: 'settings-service',
            script: './settings-service/src/index.js', // Example notification service
            watch: true,
            env: {
                NODE_ENV: 'development',
                DB_HOST: 'localhost',
                DB_USER: 'postgres',
                DB_PASS: 'admin123',
                DB_NAME: 'dream',
                DB_PORT: '5432',
                JWT_SECRET: 'Dream_jwt_secret',
                REFRESH_SECRET: 'Dream_refresh_secret',
            },
            env_production: {
                NODE_ENV: 'production',
                DB_HOST: 'localhost',
                DB_USER: 'postgres',
                DB_PASS: 'admin123',
                DB_NAME: 'dream',
                DB_PORT: '5432',
                JWT_SECRET: 'Dream_jwt_secret',
                REFRESH_SECRET: 'Dream_refresh_secret',
            },
        },
        {
            name: 'template-service',
            script: './template-service/src/index.js', // Example notification service
            watch: true,
            env: {
                NODE_ENV: 'development',
                DB_HOST: 'localhost',
                DB_USER: 'postgres',
                DB_PASS: 'admin123',
                DB_NAME: 'dream',
                DB_PORT: '5432',
                JWT_SECRET: 'Dream_jwt_secret',
                REFRESH_SECRET: 'Dream_refresh_secret',
            },
            env_production: {
                NODE_ENV: 'production',
                DB_HOST: 'localhost',
                DB_USER: 'postgres',
                DB_PASS: 'admin123',
                DB_NAME: 'dream',
                DB_PORT: '5432',
                JWT_SECRET: 'Dream_jwt_secret',
                REFRESH_SECRET: 'Dream_refresh_secret',
            },
        },
        {
            name: 'external-api-services',
            script: './external-api-services/src/index.js', // Example notification service
            watch: true,
            env: {
                NODE_ENV: 'development',
                PORT: 4006,
                DB_HOST: 'localhost',
                DB_USER: 'postgres',
                DB_PASS: 'admin123',
                DB_NAME: 'dream',
                DB_PORT: '5432',
                JWT_SECRET: 'Dream_jwt_secret',
                REFRESH_SECRET: 'Dream_refresh_secret',
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 4006,
                DB_HOST: 'localhost',
                DB_USER: 'postgres',
                DB_PASS: 'admin123',
                DB_NAME: 'dream',
                DB_PORT: '5432',
                JWT_SECRET: 'Dream_jwt_secret',
                REFRESH_SECRET: 'Dream_refresh_secret',
            },
        },
    ],
};
