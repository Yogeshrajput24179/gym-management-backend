import dotenv from "dotenv";

dotenv.config();

const rawUrl = process.env.DATABASE_URL;
const cleanUrl = rawUrl ? rawUrl.split("?")[0] : undefined;

export default {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
  },
  production: {
    url: cleanUrl,
    use_env_variable: cleanUrl ? undefined : "DATABASE_URL",
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 25504,
    dialect: "mysql",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};