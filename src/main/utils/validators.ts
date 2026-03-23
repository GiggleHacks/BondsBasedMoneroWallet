/**
 * IPC input validation utilities.
 *
 * Every value that crosses the IPC boundary from the renderer is untrusted.
 * Validate type, format, and range before passing to service code.
 */

// --- Primitives ---

export function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string`)
  }
}

export function assertOptionalString(value: unknown, name: string): asserts value is string | undefined {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new Error(`${name} must be a string or undefined`)
  }
}

export function assertNumber(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`)
  }
}

export function assertBoolean(value: unknown, name: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${name} must be a boolean`)
  }
}

// --- Domain-specific ---

/**
 * Sanitise a wallet name to prevent path-traversal attacks.
 * Only alphanumeric, underscore, and hyphen allowed. Max 64 chars.
 */
export function sanitizeWalletName(name: unknown): string {
  assertString(name, 'walletName')
  const cleaned = name.replace(/[^a-zA-Z0-9_-]/g, '')
  if (cleaned.length === 0) throw new Error('walletName must contain at least one alphanumeric character')
  if (cleaned.length > 64) throw new Error('walletName must be 64 characters or fewer')
  return cleaned
}

/**
 * Basic Monero address format check (mainnet standard or subaddress).
 * This is a fast pre-check — full cryptographic validation happens in monero-ts
 * when the address is actually used.
 *
 * Standard addresses: 95 chars, start with '4'
 * Subaddresses: 95 chars, start with '8'
 * Integrated addresses: 106 chars, start with '4'
 */
export function validateMoneroAddress(address: unknown): string {
  assertString(address, 'address')
  const trimmed = address.trim()

  if (trimmed.length !== 95 && trimmed.length !== 106) {
    throw new Error('Invalid Monero address length')
  }
  if (!trimmed.startsWith('4') && !trimmed.startsWith('8')) {
    throw new Error('Invalid Monero address prefix (must start with 4 or 8)')
  }
  // Base58 alphabet check (Monero uses 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz)
  if (!/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(trimmed)) {
    throw new Error('Invalid Monero address: contains non-Base58 characters')
  }
  return trimmed
}

/**
 * Validate an atomic amount string.
 * Must be a decimal string representing a non-negative integer.
 */
export function validateAtomicAmount(amount: unknown): string {
  assertString(amount, 'amount')
  if (!/^\d+$/.test(amount)) {
    throw new Error('amount must be a non-negative integer string (atomic units)')
  }
  const val = BigInt(amount)
  if (val <= 0n) {
    throw new Error('amount must be greater than zero')
  }
  return amount
}

/**
 * Validate transaction priority (0–3).
 */
export function validatePriority(priority: unknown): number {
  assertNumber(priority, 'priority')
  if (!Number.isInteger(priority) || priority < 0 || priority > 3) {
    throw new Error('priority must be an integer 0–3')
  }
  return priority
}

/**
 * Validate a non-empty password string.
 */
export function validatePassword(password: unknown): string {
  assertString(password, 'password')
  if (password.length === 0) {
    throw new Error('password must not be empty')
  }
  return password
}

/**
 * Validate a mnemonic seed (25 words for Monero).
 */
export function validateSeed(seed: unknown): string {
  assertString(seed, 'seed')
  const words = seed.trim().split(/\s+/)
  if (words.length !== 25) {
    throw new Error('seed must be exactly 25 words')
  }
  return seed.trim()
}

/**
 * Validate a URI string (must look like a valid URL).
 */
export function validateUri(uri: unknown): string {
  assertString(uri, 'uri')
  try {
    new URL(uri)
  } catch {
    throw new Error('Invalid URI format')
  }
  return uri
}

/**
 * Validate restore height (non-negative integer).
 */
export function validateRestoreHeight(height: unknown): number {
  assertNumber(height, 'restoreHeight')
  if (!Number.isInteger(height) || height < 0) {
    throw new Error('restoreHeight must be a non-negative integer')
  }
  return height
}

/**
 * Check if a URI uses HTTPS.
 */
export function isHttps(uri: string): boolean {
  try {
    return new URL(uri).protocol === 'https:'
  } catch {
    return false
  }
}
