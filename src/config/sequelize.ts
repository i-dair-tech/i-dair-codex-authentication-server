import dotenv from "dotenv";
import { Sequelize } from "sequelize-typescript";

dotenv.config();
const dbName = process.env.DB_NAME || "ri-codex-db";
const dbUsername = process.env.DB_USERNAME || "root";
const dbPassword = process.env.DB_PASSWORD || "root";
const host = process.env.HOST || "localhost";
export const sequelize = new Sequelize(dbName, dbUsername, dbPassword, {
  dialect: "mysql",
  host: host,
  port: 3306,
  pool: {
    max: 1000000,
    min: 0,
    idle: 20000,
    acquire: 100000,
  },
  // disable logging; default: console.log
  logging: false,
});
