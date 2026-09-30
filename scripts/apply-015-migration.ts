
import fs from "fs";
import path from "path";

// 1. Load Environment Variables BEFORE importing lib/db
function loadEnv(fileName: string) {
  try {
    const envPath = path.join(process.cwd(), fileName);
    if (fs.existsSync(envPath)) {
      console.log(`Loading ${fileName}...`);
      const envConfig = fs.readFileSync(envPath, "utf-8");
      console.log(`Read ${envConfig.length} chars from ${fileName}`);
       envConfig.replace(/\r/g, '').split("\n").forEach((line, index) => {
         const match = line.match(/^\s*([^=]+?)\s*=(.*)$/);
        if (line.includes("CRYPTO_SECRET_KEY") || line.includes("DATABASE_URL")) {
             console.log(`Line ${index}: ${line.trim()}`);
             console.log(`Match: ${match ? "Yes" : "No"}`);
             if (match) console.log(`Key: ${match[1]}, Value: ${match[2]}`);
        }
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
          if (key && !key.startsWith('#')) {
             process.env[key] = value;
             console.log(`Loaded ${key}`); 
          }
        }
      });
       return true;
     }
  } catch (e) {
    console.warn(`Could not load ${fileName}`, e);
  }
  return false;
}

// Try loading .env.dev explicitly since we know it contains the keys in this environment
loadEnv(".env.dev");
if (!process.env.DATABASE_URL) {
    loadEnv(".env.prod");
}
if (!process.env.DATABASE_URL) {
    loadEnv(".env");
}

async function run() {
  // 2. Dynamic import ensures process.env is set before lib/db is initialized
  const { getPool } = await import("../lib/db");
  
  const pool = getPool();
  if (!pool) {
    console.error("Failed to connect to DB - check DATABASE_URL");
    process.exit(1);
  }

  const sqlPath = path.join(process.cwd(), "migrations", "015_create_api_keys.sql");
  if (!fs.existsSync(sqlPath)) {
     console.error(`Migration file not found: ${sqlPath}`);
     process.exit(1);
  }
  
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
    pool.end(); 
  }
}

run();
