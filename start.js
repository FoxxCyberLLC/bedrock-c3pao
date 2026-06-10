/**
 * Bootstrap script — loads configuration from PostgreSQL into process.env,
 * generates a self-signed TLS certificate if needed, starts the Next.js
 * server on an internal HTTP port, and exposes an HTTPS reverse proxy
 * on the external port.
 *
 * Usage: node start.js (replaces node server.js in Docker CMD)
 *
 * Note: execSync is used intentionally for OpenSSL cert generation with
 * hardcoded arguments (no user input). This is safe from injection.
 */

const path = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')
const crypto = require('crypto')
const { execSync } = require('child_process')

const ENC_PREFIX = 'enc:v1:'

/**
 * Inline AES-256-GCM decrypt for the shared `enc:v1:<iv>:<tag>:<ct>` config
 * format. start.js runs as `node start.js` from the Next.js standalone build
 * and CANNOT import the TypeScript `lib/crypto.ts`, so this must stay
 * byte-compatible with `lib/crypto.encryptValue`. Read-through for legacy
 * plaintext (no prefix). Throws on a missing/short key or a failed GCM tag —
 * a broken AUTH_SECRET must fail loudly, not boot with auth silently broken.
 */
function decryptConfigValue(blob) {
  if (typeof blob !== 'string' || !blob.startsWith(ENC_PREFIX)) return blob
  const raw = process.env.CONFIG_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('CONFIG_ENCRYPTION_KEY is not set — cannot decrypt config values')
  }
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('CONFIG_ENCRYPTION_KEY must decode to 32 bytes')
  }
  const parts = blob.slice(ENC_PREFIX.length).split(':')
  if (parts.length !== 3) {
    throw new Error('Malformed enc:v1 ciphertext — expected iv:tag:ct')
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(parts[0], 'base64')
  )
  decipher.setAuthTag(Buffer.from(parts[1], 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(parts[2], 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

/**
 * Build the pg SSL config from the connection URL and an optional CA cert.
 * Mirror of lib/db.ts buildSslConfig (CommonJS — keep both in sync):
 * no sslmode → undefined (internal DB); sslmode + CA → verified TLS;
 * sslmode without a CA → throw (fail closed, never rejectUnauthorized:false).
 */
function buildSslConfig(databaseUrl, caCert) {
  if (!databaseUrl || !databaseUrl.includes('sslmode=')) {
    return undefined
  }
  if (!caCert || caCert.trim() === '') {
    throw new Error(
      'DATABASE_URL requests SSL (sslmode=) but DATABASE_CA_CERT is not set. ' +
        'Provide the server CA certificate (PEM) so the connection can be verified, ' +
        'or remove sslmode from DATABASE_URL for an unencrypted internal connection.'
    )
  }
  return { ca: caCert, rejectUnauthorized: true }
}

const CERT_DIR = path.join(__dirname, 'data', 'certs')
const TLS_CERT = path.join(CERT_DIR, 'cert.pem')
const TLS_KEY = path.join(CERT_DIR, 'key.pem')

const INTERNAL_PORT = 3000
const EXTERNAL_PORT = parseInt(process.env.PORT || '3001', 10)

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
  // execSync with hardcoded arguments only — no user input, safe from injection
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

async function loadConfig() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.log('[start] No DATABASE_URL set — setup wizard will be shown')
    return
  }

  let Pool
  try {
    Pool = require('pg').Pool
  } catch (e) {
    console.error('[start] Failed to load pg:', e.message)
    return
  }

  // Strip sslmode from URL and configure SSL separately
  const connStr = databaseUrl.replace(/[?&]sslmode=[^&]*/g, '')
  const pool = new Pool({
    connectionString: connStr,
    max: 1,
    connectionTimeoutMillis: 15000,
    ssl: buildSslConfig(databaseUrl, process.env.DATABASE_CA_CERT),
  })

  let rows
  try {
    // Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS local_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    rows = (await pool.query('SELECT key, value FROM app_config')).rows
  } catch (e) {
    // DB unreachable / DDL error → fall through to the setup wizard. This is a
    // recoverable state, unlike a decrypt failure below.
    console.error('[start] Failed to load config from PostgreSQL:', e.message)
    return
  } finally {
    await pool.end()
  }

  // Decrypt sensitive values and inject all config into process.env. A decrypt
  // failure here is FATAL (misconfigured CONFIG_ENCRYPTION_KEY / tampered row):
  // let it propagate so bootstrap surfaces it rather than booting with a broken
  // AUTH_SECRET that breaks every login.
  for (const row of rows) {
    process.env[row.key] = decryptConfigValue(row.value)
  }

  if (rows.length > 0) {
    console.log(`[start] Loaded ${rows.length} config values from PostgreSQL`)
  } else {
    console.log('[start] No config found — setup wizard will be shown')
  }
}

async function bootstrap() {
  await loadConfig()
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

// Only auto-start when executed directly (node start.js). When required by a
// test, skip bootstrap and expose the testable pieces instead.
if (require.main === module) {
  bootstrap()
}

module.exports = { decryptConfigValue, buildSslConfig }
