import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "mysql",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Required for cloud databases like Aiven
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