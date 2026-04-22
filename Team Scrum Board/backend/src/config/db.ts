import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const dbUser = process.env.DB_USER;
const dbHost = process.env.DB_HOST || "localhost";
const dbName = process.env.DB_NAME;
const dbPassword = process.env.DB_PASSWORD;
const dbPort = Number(process.env.DB_PORT || 5432);

if (!dbUser || !dbName || !dbPassword) {
  throw new Error(
    "Missing database environment variables. Please set DB_USER, DB_NAME, and DB_PASSWORD."
  );
}

export const pool = new Pool({
  user: dbUser,
  host: dbHost,
  database: dbName,
  password: dbPassword,
  port: dbPort,
});