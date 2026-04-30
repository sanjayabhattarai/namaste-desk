import { defineConfig } from "@prisma/config";

export default defineConfig({
  // Tells Prisma where your models are
  schema: "prisma/schema.prisma",
  
  datasource: {
    // We use the environment variable. 
    // In Dev, it defaults to dev.db. 
    // In Prod, our main.js will override this with the AppData path.
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  },
});