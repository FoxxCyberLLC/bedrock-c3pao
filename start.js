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
const { execSync } = require('child_process')

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

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 15000,
  })

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

    // Inject all config into process.env
    const { rows } = await pool.query('SELECT key, value FROM app_config')
    for (const row of rows) {
      process.env[row.key] = row.value
    }

    if (rows.length > 0) {
      console.log(`[start] Loaded ${rows.length} config values from PostgreSQL`)
    } else {
      console.log('[start] No config found — setup wizard will be shown')
    }
  } catch (e) {
    console.error('[start] Failed to load config from PostgreSQL:', e.message)
  } finally {
    await pool.end()
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

bootstrap()
