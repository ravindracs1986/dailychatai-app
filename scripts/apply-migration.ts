import { getPool } from "../lib/db";
import fs from "fs";
import path from "path";

// Simple .env parser since dotenv might not be installed
try {
  const envPath = path.join(process.cwd(), ".env.dev");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // Remove quotes if present
        if (key && !key.startsWith('#')) {
            process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  console.warn("Could not load .env.dev", e);
}

async function run() {
  const pool = getPool();
  if (!pool) {
    console.error("Failed to connect to DB");
    process.exit(1);
  }

  const sqlPath = path.join(process.cwd(), "migrations", "011_payment_gateways.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const statements = sql.split(';').filter(s => s.trim().length > 0);

  const connection = await pool.getConnection();
  try {
    for (const statement of statements) {
      await connection.query(statement);
      console.log("Executed statement");
    }
    console.log("Migration applied successfully");
  } catch (e) {
    console.error("Migration failed", e);
  } finally {
    connection.release();
    pool.end(); // Use pool.end() to close the pool
  }
}

run();
