const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

// Simple .env parser
function loadEnvFile(filename) {
  try {
    const envPath = path.join(__dirname, '..', filename);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          // Only set if not already set (preserves system env vars and order of precedence)
          if (process.env[key] === undefined) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (e) {
    console.warn(`Failed to load ${filename}`, e);
  }
}

function loadEnv() {
  // Load in order of precedence: .env.local -> .env.dev -> .env
  loadEnvFile('.env.local');
  loadEnvFile('.env.dev');
  loadEnvFile('.env');
}

loadEnv();

function decrypt(text) {
  if (!text || !text.startsWith('ENC:')) return text;
  
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text;
    
    const ivHex = parts[1];
    const encryptedHex = parts[2];
    
    const secretKey = (process.env.CRYPTO_SECRET_KEY || '').trim();
    const algorithm = (process.env.CRYPTO_ALGORITHM || 'aes-256-cbc').trim();
    
    if (!secretKey) return text;
    
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(secretKey, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.warn('Decryption failed:', error.message);
    return text;
  }
}

async function run() {
  const dbUrl = decrypt(process.env.DATABASE_URL);
  
  if (!dbUrl) {
    console.error('DATABASE_URL is missing');
    return;
  }

  const connection = await mysql.createConnection(dbUrl);
  
  const sqlPath = path.join(__dirname, '..', 'migrations', '009_add_role_to_users.sql');
  if (!fs.existsSync(sqlPath)) {
    console.log('Migration file not found, skipping.');
    await connection.end();
    return;
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  const statements = sql.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await connection.query(statement);
        console.log('Executed:', statement.substring(0, 50) + '...');
      } catch (err) {
        // Ignore if column already exists
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('Column already exists, skipping.');
        } else {
          console.error('Error executing:', statement, err);
        }
      }
    }
  }
  
  await connection.end();
}

run().catch(console.error);
