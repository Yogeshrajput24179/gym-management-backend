import dotenv from "dotenv";

dotenv.config();

const rawUrl = process.env.DATABASE_URL;
const cleanUrl = rawUrl ? rawUrl.split("?")[0] : undefined;

const productionConfig = cleanUrl
  ? {
      url: cleanUrl,
      dialect: "mysql",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    }
  : {
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "test",
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 4000, // Updated for TiDB Cloud
      dialect: "mysql",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    };

export default {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
  },
  production: productionConfig,
};