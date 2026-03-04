/**
 * Bootstrap script — loads configuration from SQLite into process.env
 * before starting the Next.js server.
 *
 * Usage: node start.js (replaces node server.js in Docker CMD)
 */

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const DB_PATH = path.join(__dirname, 'data', 'config.db')
const KEY_PATH = path.join(__dirname, 'data', '.encryption-key')
const INSTANCE_JSON = path.join(__dirname, 'data', 'instance.json')
const MIGRATED_JSON = path.join(__dirname, 'data', 'instance.json.migrated')

/**
 * Decrypt AES-256-GCM packed value: "iv:authTag:ciphertext" (base64)
 */
function decrypt(packed, keyBuf) {
  const [ivB64, authTagB64, ciphertext] = packed.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(ciphertext, 'base64', 'utf-8')
  decrypted += decipher.final('utf-8')
  return decrypted
}

function bootstrap() {
  const dataDir = path.join(__dirname, 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  let Database
  try {
    Database = require('better-sqlite3')
  } catch (e) {
    console.error('[start] Failed to load better-sqlite3:', e.message)
    process.exit(1)
  }

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      encrypted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS local_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Migrate instance.json from previous versions
  if (fs.existsSync(INSTANCE_JSON) && !fs.existsSync(MIGRATED_JSON)) {
    try {
      const raw = JSON.parse(fs.readFileSync(INSTANCE_JSON, 'utf-8'))
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO app_config (key, value, encrypted, updated_at) VALUES (?, ?, 0, datetime('now'))`
      )
      const tx = db.transaction(() => {
        if (raw.instanceApiKey) stmt.run('INSTANCE_API_KEY', raw.instanceApiKey)
        if (raw.apiUrl) stmt.run('BEDROCK_API_URL', raw.apiUrl)
        if (raw.c3paoId) stmt.run('C3PAO_ID', raw.c3paoId)
        if (raw.c3paoName) stmt.run('C3PAO_NAME', raw.c3paoName)
        if (raw.activatedAt) stmt.run('ACTIVATED_AT', raw.activatedAt)
      })
      tx()
      fs.renameSync(INSTANCE_JSON, MIGRATED_JSON)
      console.log('[start] Migrated instance.json to config.db')
    } catch (e) {
      console.error('[start] Migration warning:', e.message)
    }
  }

  // Load encryption key (if exists) for decrypting sensitive values
  let encryptionKey = null
  if (fs.existsSync(KEY_PATH)) {
    encryptionKey = Buffer.from(fs.readFileSync(KEY_PATH, 'utf-8').trim(), 'hex')
  }

  // Inject all config into process.env
  const rows = db.prepare('SELECT key, value, encrypted FROM app_config').all()
  for (const row of rows) {
    if (row.encrypted && encryptionKey) {
      try {
        process.env[row.key] = decrypt(row.value, encryptionKey)
      } catch (e) {
        console.error(`[start] Failed to decrypt ${row.key}:`, e.message)
      }
    } else {
      process.env[row.key] = row.value
    }
  }

  db.close()

  if (rows.length > 0) {
    console.log(`[start] Loaded ${rows.length} config values from SQLite`)
  } else {
    console.log('[start] No config found — setup wizard will be shown')
  }

  // Start Next.js
  require('./server.js')
}

bootstrap()
