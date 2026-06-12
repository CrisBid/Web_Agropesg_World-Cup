import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { defineConfig } = require("prisma/config");
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export default defineConfig({
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
  migrate: {
    async adapter(env: Record<string, string>) {
      const pool = new Pool({ connectionString: env.DATABASE_URL });
      return new PrismaPg(pool);
    },
  },
});
