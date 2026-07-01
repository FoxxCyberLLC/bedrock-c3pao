# foxx-license — offline license minting for Bedrock C3PAO

Foxx-internal CLI to mint & verify the Ed25519-signed license files used by the **air-gapped**
Bedrock C3PAO. See compliance **ADR 0002 — Offline Licensing Model**.

## ⚠️ Key handling

- The **private key** signs licenses. **Vault it. Never commit it. Never ship it** in the container
  image. (`*.pem` and `keys/` are gitignored here as a backstop.)
- The **public key** is embedded in the c3pao build (`LICENSE_PUBLIC_KEY`, base64url SPKI DER) and is
  what the container uses to verify a license offline.

## Commands

```bash
# 1) One-time: generate the signing keypair (prints the embeddable public key)
node foxx-license.mjs keygen --out ./keys

# 2) Mint a per-year license for a customer
node foxx-license.mjs issue --org "Number One Cyber" --expires 2027-07-01 \
     --key ./keys/foxx-license.private.pem
#   options: --tier STANDARD  --binding org|instance  --instance <c3paoId>  --seats N  --days 365

# 3) Verify a license (what the container does, offline)
node foxx-license.mjs verify --token <token> --pub ./keys/foxx-license.public.pem
#   exit 0 = valid & current · exit 1 = bad signature · exit 2 = valid but expired
```

## Token format

`base64url(payloadJSON).base64url(ed25519-signature-over-the-b64-payload)` — a single opaque string
the customer sets as `LICENSE_KEY` (or pastes into the setup wizard). Payload:

```jsonc
{ "v":1, "licenseId":"<uuid>", "licensee":"Number One Cyber", "tier":"STANDARD",
  "issuedAt":"2026-07-01", "expiresAt":"2027-07-01", "binding":"org" /*, "maxSeats":5 */ }
```

The c3pao app mirrors `verifyToken()` from `foxx-license.mjs` for its offline enforcement (Task 25):
verify signature → read `expiresAt` from the signed payload → apply the grace-window policy.

No third-party dependencies (pure `node:crypto`). Node ≥ 18.
