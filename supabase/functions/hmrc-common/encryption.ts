// Encryption utilities for HMRC sensitive data using Web Crypto API

const ALGORITHM = 'AES-GCM'
const IV_LENGTH = 12 // GCM standard IV length
const TAG_LENGTH = 16
const KEY_LENGTH = 256
const SALT_LENGTH = 32

// Text encoder/decoder for string conversion
const encoder = new TextEncoder()
const decoder = new TextDecoder()

// Derive encryption key from password using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

// Get or generate encryption key
async function getEncryptionKey(): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const keyString = Deno.env.get('HMRC_ENCRYPTION_KEY')
  if (!keyString) {
    throw new Error('HMRC_ENCRYPTION_KEY not configured')
  }
  
  // Use a fixed salt derived from the key for consistency
  // In production, you might want to store salts separately
  const salt = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(keyString + '_salt')
  ).then(buf => new Uint8Array(buf).slice(0, SALT_LENGTH))
  
  const key = await deriveKey(keyString, salt)
  return { key, salt }
}

export async function encrypt(text: string): Promise<string> {
  if (!text) return text
  
  try {
    const { key } = await getEncryptionKey()
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    const data = encoder.encode(text)
    
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      data
    )
    
    // Combine iv and encrypted data (auth tag is included in encryptedData for GCM)
    const combined = new Uint8Array(iv.length + encryptedData.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encryptedData), iv.length)
    
    // Convert to base64
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('Encryption error:', error)
    // In development, return plaintext with warning prefix
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      return `UNENCRYPTED:${text}`
    }
    throw error
  }
}

export async function decrypt(encryptedText: string): Promise<string> {
  if (!encryptedText) return encryptedText
  
  // Handle development unencrypted data
  if (encryptedText.startsWith('UNENCRYPTED:')) {
    return encryptedText.replace('UNENCRYPTED:', '')
  }
  
  try {
    const { key } = await getEncryptionKey()
    
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0))
    
    // Extract components
    const iv = combined.slice(0, IV_LENGTH)
    const encryptedData = combined.slice(IV_LENGTH)
    
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      encryptedData
    )
    
    return decoder.decode(decryptedData)
  } catch (error) {
    console.error('Decryption error:', error)
    // In development, return as-is if decryption fails
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      return encryptedText
    }
    throw error
  }
}

export async function encryptTokens(tokens: any): Promise<any> {
  if (!tokens) return tokens
  
  const encrypted = { ...tokens }
  
  // Encrypt sensitive token fields
  if (tokens.access_token) {
    encrypted.access_token = await encrypt(tokens.access_token)
  }
  if (tokens.refresh_token) {
    encrypted.refresh_token = await encrypt(tokens.refresh_token)
  }
  
  return encrypted
}

export async function decryptTokens(encryptedTokens: any): Promise<any> {
  if (!encryptedTokens) return encryptedTokens
  
  const decrypted = { ...encryptedTokens }
  
  // Decrypt sensitive token fields
  if (encryptedTokens.access_token) {
    decrypted.access_token = await decrypt(encryptedTokens.access_token)
  }
  if (encryptedTokens.refresh_token) {
    decrypted.refresh_token = await decrypt(encryptedTokens.refresh_token)
  }
  
  return decrypted
}

export async function encryptSensitiveData(data: any): Promise<any> {
  const encrypted = { ...data }
  
  // Encrypt specific sensitive fields
  if (data.nino) encrypted.nino = await encrypt(data.nino)
  if (data.utr) encrypted.utr = await encrypt(data.utr)
  
  return encrypted
}

export async function decryptSensitiveData(data: any): Promise<any> {
  const decrypted = { ...data }
  
  // Decrypt specific sensitive fields
  if (data.nino) decrypted.nino = await decrypt(data.nino)
  if (data.utr) decrypted.utr = await decrypt(data.utr)
  
  return decrypted
}