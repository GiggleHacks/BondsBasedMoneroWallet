import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH = 32
const IV_LENGTH = 12
const SALT_LENGTH = 32
const TAG_LENGTH = 16

export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
}

export function encrypt(data: string, passphrase: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(passphrase, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  // Format: salt(hex):iv(hex):tag(hex):ciphertext(hex)
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted,
  ].join(':')
}

export function decrypt(encryptedData: string, passphrase: string): string {
  const parts = encryptedData.split(':')
  if (parts.length !== 4) throw new Error('Invalid encrypted data format')

  const salt = Buffer.from(parts[0], 'hex')
  const iv = Buffer.from(parts[1], 'hex')
  const tag = Buffer.from(parts[2], 'hex')
  const ciphertext = parts[3]

  const key = deriveKey(passphrase, salt)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
