#!/usr/bin/env node
/**
 * foxx-license — Foxx-internal CLI to mint & verify offline license files for the air-gapped
 * Bedrock C3PAO. Ed25519 signatures, verified 100% offline. See compliance ADR 0002.
 *
 * ⚠️ The PRIVATE key must be vaulted and NEVER committed or shipped in the container image.
 *    Only the PUBLIC key is embedded in the c3pao build for verification.
 *
 * License token format:  base64url(payloadJSON) "." base64url(ed25519 signature over the b64 payload)
 *
 * Usage:
 *   node foxx-license.mjs keygen  [--out ./keys]
 *   node foxx-license.mjs issue   --org "Number One Cyber" --expires 2027-07-01 \
 *                                 --key ./keys/foxx-license.private.pem [--tier STANDARD] \
 *                                 [--binding org] [--instance <c3paoId>] [--seats N]
 *   node foxx-license.mjs verify  --token <token> --pub ./keys/foxx-license.public.pem
 */
import { generateKeyPairSync, sign, verify, randomUUID, createPublicKey, createPrivateKey } from 'node:crypto'
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const FORMAT_VERSION = 1
const b64url = (buf) => Buffer.from(buf).toString('base64url')
const fromB64url = (s) => Buffer.from(s, 'base64url')

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) out[key] = true
      else { out[key] = next; i++ }
    }
  }
  return out
}

function die(msg) {
  console.error(`error: ${msg}`)
  process.exit(1)
}

function cmdKeygen(args) {
  const outDir = resolve(args.out || './keys')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' })
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' })
  const privPath = resolve(outDir, 'foxx-license.private.pem')
  const pubPath = resolve(outDir, 'foxx-license.public.pem')
  writeFileSync(privPath, privPem, { mode: 0o600 })
  writeFileSync(pubPath, pubPem)
  // Also emit the public key as a single base64 line, convenient for embedding as an env/const.
  const pubB64 = b64url(publicKey.export({ type: 'spki', format: 'der' }))
  console.log('Ed25519 keypair generated:')
  console.log(`  private (VAULT — do not commit/ship):  ${privPath}`)
  console.log(`  public  (embed in c3pao image):        ${pubPath}`)
  console.log('')
  console.log('Embed this public key in the c3pao build (LICENSE_PUBLIC_KEY, base64url SPKI DER):')
  console.log(`  ${pubB64}`)
}

function cmdIssue(args) {
  if (!args.org) die('--org "<Licensee Name>" is required')
  if (!args.key) die('--key <private.pem> is required')
  const privateKey = createPrivateKey(readFileSync(resolve(args.key)))

  const now = new Date()
  const issuedAt = now.toISOString().slice(0, 10)
  let expiresAt
  if (args.expires) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.expires)) die('--expires must be YYYY-MM-DD')
    expiresAt = args.expires
  } else {
    const days = Number(args.days || 365)
    const exp = new Date(now.getTime() + days * 86400_000)
    expiresAt = exp.toISOString().slice(0, 10)
  }

  const binding = args.instance ? `instance:${args.instance}` : (args.binding || 'org')
  const payload = {
    v: FORMAT_VERSION,
    licenseId: randomUUID(),
    licensee: String(args.org),
    tier: String(args.tier || 'STANDARD'),
    issuedAt,
    expiresAt,
    binding,
    ...(args.seats ? { maxSeats: Number(args.seats) } : {}),
  }
  const payloadB64 = b64url(JSON.stringify(payload))
  const signature = sign(null, Buffer.from(payloadB64), privateKey)
  const token = `${payloadB64}.${b64url(signature)}`

  console.log('License issued:')
  console.log(JSON.stringify(payload, null, 2))
  console.log('')
  console.log('License key (deliver to customer — LICENSE_KEY / setup wizard):')
  console.log(token)
}

/** Shared verification logic — the c3pao app mirrors this (Task 25). */
export function verifyToken(token, publicKey) {
  const parts = String(token).split('.')
  if (parts.length !== 2) return { valid: false, reason: 'malformed token' }
  const [payloadB64, sigB64] = parts
  const ok = verify(null, Buffer.from(payloadB64), publicKey, fromB64url(sigB64))
  if (!ok) return { valid: false, reason: 'bad signature' }
  let payload
  try { payload = JSON.parse(fromB64url(payloadB64).toString('utf8')) } catch { return { valid: false, reason: 'unparseable payload' } }
  const today = new Date().toISOString().slice(0, 10)
  const expired = payload.expiresAt < today
  return { valid: true, expired, payload }
}

function cmdVerify(args) {
  if (!args.token) die('--token <token> is required')
  if (!args.pub) die('--pub <public.pem> is required')
  const publicKey = createPublicKey(readFileSync(resolve(args.pub)))
  const result = verifyToken(args.token, publicKey)
  if (!result.valid) die(`signature check FAILED: ${result.reason}`)
  console.log('Signature: VALID')
  console.log(`Expired:   ${result.expired ? 'YES (past expiresAt)' : 'no'}`)
  console.log(JSON.stringify(result.payload, null, 2))
  process.exit(result.expired ? 2 : 0)
}

const [cmd, ...rest] = process.argv.slice(2)
const args = parseArgs(rest)
switch (cmd) {
  case 'keygen': cmdKeygen(args); break
  case 'issue': cmdIssue(args); break
  case 'verify': cmdVerify(args); break
  default:
    console.log('foxx-license — offline license minting for Bedrock C3PAO (ADR 0002)')
    console.log('commands: keygen | issue | verify   (run a command with no args for details)')
    process.exit(cmd ? 1 : 0)
}
