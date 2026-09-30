const crypto = require('crypto');

// Config from environment (simulating lib/crypto.ts logic since we can't import typescript directly in node script without compilation)
const ALGORITHM = (process.env.CRYPTO_ALGORITHM || "aes-256-cbc").trim();
const SECRET_KEY = (process.env.CRYPTO_SECRET_KEY || "").trim();
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const keyBuffer = Buffer.from(SECRET_KEY, "hex");
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `ENC:${iv.toString("hex")}:${encrypted}`;
}

// Check if a password argument is provided
const password = process.argv[2];

if (!password) {
  console.log('Usage: node encrypt-password.js <password>');
  console.log('Or modify this script to hardcode the password if it contains special characters.');
  process.exit(1);
}

const encrypted = encrypt(password);
console.log('Encrypted password:');
console.log(encrypted);
console.log('\nAdd this to your .env file:');
console.log(`SMTP_PASS=${encrypted}`);
