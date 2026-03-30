/**
 * Bootstrap script — loads configuration from SQLite into process.env,
 * generates a self-signed TLS certificate if needed, starts the Next.js
 * server on an internal HTTP port, and exposes an HTTPS reverse proxy
 * on the external port.
 *
 * Usage: node start.js (replaces node server.js in Docker CMD)
 */

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const https = require('https')
const http = require('http')
const { execSync } = require('child_process')

const DB_PATH = path.join(__dirname, 'data', 'config.db')
const KEY_PATH = path.join(__dirname, 'data', '.encryption-key')
const INSTANCE_JSON = path.join(__dirname, 'data', 'instance.json')
const MIGRATED_JSON = path.join(__dirname, 'data', 'instance.json.migrated')
const CERT_DIR = path.join(__dirname, 'data', 'certs')
const TLS_CERT = path.join(CERT_DIR, 'cert.pem')
const TLS_KEY = path.join(CERT_DIR, 'key.pem')

const INTERNAL_PORT = 3000
const EXTERNAL_PORT = parseInt(process.env.PORT || '3001', 10)

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

/**
 * Generate a self-signed TLS certificate if one doesn't already exist.
 * Users can mount their own cert.pem / key.pem into /app/data/certs/ to
 * use a real certificate instead.
 */
function ensureCerts() {
  if (fs.existsSync(TLS_CERT) && fs.existsSync(TLS_KEY)) {
    console.log('[start] Using existing TLS certificates')
    return
  }

  fs.mkdirSync(CERT_DIR, { recursive: true })

  console.log('[start] Generating self-signed TLS certificate...')
  execSync(
    `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-384 -nodes ` +
    `-keyout "${TLS_KEY}" -out "${TLS_CERT}" ` +
    `-days 825 -subj "/CN=bedrock-c3pao/O=Bedrock" ` +
    `-addext "subjectAltName=DNS:localhost,DNS:bedrock-c3pao,IP:127.0.0.1"`,
    { stdio: 'pipe' }
  )
  fs.chmodSync(TLS_KEY, 0o600)
  console.log('[start] Self-signed TLS certificate generated (ECDSA P-384, valid ~2.25 years)')
}

/**
 * Create an HTTPS reverse proxy that forwards to the internal Next.js
 * HTTP server. Handles regular requests, streaming (SSE), and WebSocket
 * upgrades.
 */
function startHttpsProxy() {
  const cert = fs.readFileSync(TLS_CERT)
  const key = fs.readFileSync(TLS_KEY)

  const server = https.createServer({ key, cert }, (req, res) => {
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: INTERNAL_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        'x-forwarded-proto': 'https',
        'x-forwarded-host': req.headers.host,
        'x-forwarded-for': req.socket.remoteAddress,
      },
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    })

    proxyReq.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(503)
        res.end('Service starting...')
      }
    })

    req.pipe(proxyReq)
  })

  // WebSocket upgrade support
  server.on('upgrade', (req, socket, head) => {
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: INTERNAL_PORT,
      path: req.url,
      method: 'GET',
      headers: {
        ...req.headers,
        'x-forwarded-proto': 'https',
      },
    })

    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      const headers = Object.entries(proxyRes.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n')
      socket.write(`HTTP/1.1 101 Switching Protocols\r\n${headers}\r\n\r\n`)
      if (proxyHead.length) socket.write(proxyHead)
      proxySocket.pipe(socket)
      socket.pipe(proxySocket)
    })

    proxyReq.on('error', () => socket.destroy())
    proxyReq.end()
  })

  server.listen(EXTERNAL_PORT, '0.0.0.0', () => {
    console.log(`[start] HTTPS listening on https://0.0.0.0:${EXTERNAL_PORT}`)
  })
}

function loadConfig() {
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
  db.pragma('busy_timeout = 5000')

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
}

function bootstrap() {
  loadConfig()
  ensureCerts()

  // Container always serves HTTPS
  process.env.FORCE_HTTPS = 'true'

  // Next.js listens on internal HTTP-only port (not exposed)
  process.env.PORT = String(INTERNAL_PORT)
  process.env.HOSTNAME = '127.0.0.1'

  // Start Next.js (internal HTTP)
  require('./server.js')

  // Start HTTPS reverse proxy (exposed)
  startHttpsProxy()
}

bootstrap()
