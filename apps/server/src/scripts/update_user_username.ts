import { prisma } from "../utils/prisma.js";
import dotenv from "dotenv";

// Load server .env
dotenv.config();

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users:`);
}

main()
  .catch((err) => {
    console.error("Error in script:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
