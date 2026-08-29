# License signing keys (Ed25519)

Offline license leases are signed with Ed25519 (`signLease` / `verifyLease` in `@khepree/licensing`). The **private** key must never enter git, Docker layers, `NEXT_PUBLIC_*`, or browser bundles.

## Development

If `LICENSE_SIGNING_PRIVATE_KEY` is unset and `NODE_ENV` is not `production`, the licensing package generates an **ephemeral** in-memory keypair. Restarts invalidate outstanding leases. That is acceptable locally only.

You may also generate a dedicated **development** keypair and put it in local `.env` (gitignored). Do not use the production pair.

## Generate a keypair (do not commit the output)

```bash
node -e "const {generateKeyPairSync}=require('crypto'); const k=generateKeyPairSync('ed25519'); console.log('private', k.privateKey.export({type:'pkcs8',format:'der'}).toString('base64')); console.log('public', k.publicKey.export({type:'spki',format:'der'}).toString('base64'))"
```

Store:

- `LICENSE_SIGNING_PRIVATE_KEY` — PKCS8 DER, base64 — **secret infrastructure only** (the same class of store as `BETTER_AUTH_SECRET`).
- `LICENSE_SIGNING_PUBLIC_KEY` — SPKI DER, base64 — server env; still not a browser public token for authorization.

Production boot **fails** if either is missing (`validateRuntimeEnv()`).

## Production storage

1. Generate the keypair on a trusted machine (or the secret manager’s generator).
2. Save the private key in the production secret store. Restrict who can read it.
3. Inject it into the runtime as an environment variable or mounted secret file. Do not bake it into the image.
4. Keep a sealed copy for disaster recovery, separate from the app repo.
5. **Never** paste the production private key into chat, tickets, or this repository.

This document does not generate or record a production key.

## Rotation (later)

Rotation is not implemented as dual-key verification. A new keypair invalidates leases signed with the old key after expiry (plus grace). Plan a maintenance window or a dual-verify change before rotating production keys. See `docs/TODOS.md` (POST-MVP).
