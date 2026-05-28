import { PrismaClient } from "./generated/client/index.js";

export const prisma = new PrismaClient();

export type DatabaseHealth = {
  configured: boolean;
  provider: "postgresql";
};

export const databaseHealth: DatabaseHealth = {
  configured: Boolean(process.env.DATABASE_URL),
  provider: "postgresql"
};
