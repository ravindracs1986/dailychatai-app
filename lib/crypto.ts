import crypto from "crypto"

// Config from environment
const ALGORITHM = (process.env.CRYPTO_ALGORITHM || "aes-256-cbc").trim()
const SECRET_KEY = (process.env.CRYPTO_SECRET_KEY || "").trim()
const IV_LENGTH = 16 // For AES, this is always 16

if (!SECRET_KEY || SECRET_KEY.length !== 64) {
  console.warn("Warning: CRYPTO_SECRET_KEY is not set or not 64 hex characters (32 bytes). Encryption may fail.")
}

/**
 * Encrypts a string value.
 * Output format: ENC:iv_hex:encrypted_hex
 */
export function encrypt(text: string): string {
  if (!text) return ""
  
  // Create a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH)
  
  // Create cipher with key and iv
  // Key needs to be buffer if it's hex string, or just string if it's correct length. 
  // Given the example key is 64 chars (32 bytes hex), we treat it as hex.
  const keyBuffer = Buffer.from(SECRET_KEY, "hex")
  
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv)
  
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  return `ENC:${iv.toString("hex")}:${encrypted}`
}

/**
 * Decrypts a string value.
 * Input format: ENC:iv_hex:encrypted_hex
 * If input doesn't start with ENC:, returns it as is.
 */
export function decrypt(text: string): string {
  if (!text || !text.startsWith("ENC:")) return text
  
  try {
    const parts = text.split(":")
    if (parts.length !== 3) return text
    
    const ivHex = parts[1]
    const encryptedHex = parts[2]
    
    const iv = Buffer.from(ivHex, "hex")
    const keyBuffer = Buffer.from(SECRET_KEY, "hex")
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv)
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8")
    decrypted += decipher.final("utf8")
    
    return decrypted
  } catch (error) {
    console.error("Decryption failed:", error)
    return text // Return original if decryption fails (fallback)
  }
}

/**
 * Helper to get environment variable with automatic decryption
 */
export function getEnv(key: string, defaultValue: string = ""): string {
  const value = process.env[key]
  if (!value) return defaultValue
  return decrypt(value)
}
