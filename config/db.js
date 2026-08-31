import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const rawUrl = process.env.DATABASE_URL;

// Strip query parameters like ?ssl-mode=... from the URL string
const cleanDatabaseUrl = rawUrl ? rawUrl.split("?")[0] : null;

const sequelize = cleanDatabaseUrl
  ? new Sequelize(cleanDatabaseUrl, {
      dialect: "mysql",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      logging: false,
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 25504,
        dialect: "mysql",
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        },
        logging: false,
      }
    );

export default sequelize;