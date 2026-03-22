import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./lib/db/schema.ts",
    out: "./drizzle",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.DB_PATH || "../backend/data/vaidyavision.db",
    },
});
