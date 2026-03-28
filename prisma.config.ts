import { config } from 'dotenv';
import { resolve } from 'path';
import { defineConfig } from "prisma/config";

config({ path: resolve(process.cwd(), '.env.local') });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});