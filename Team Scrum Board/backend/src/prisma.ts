import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbPath = path.join(__dirname, "../prisma/dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma = new PrismaClient({ adapter } as any);
