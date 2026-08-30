# VPS security runbook

Operational security guide for running Khepree on a single **Ubuntu 24.04 LTS** VPS with `compose.production.yml`. This document does not change application code — it hardens the host and documents safe deployment practice.

Related: `compose.production.yml`, `.env.production.example`, `docs/DEPLOYMENT.md`.

## Scope

| In scope | Out of scope |
|----------|--------------|
| OS user, SSH, firewall, Docker install | Application features, RBAC logic |
| Secret storage on the VPS | Cloudflare R2 bucket policy (see `docs/R2.md`) |
| Cloudflare DNS / proxy / Access guidance | SePay go-live (B1 still open) |

## Quick checklist

Run in order on a fresh VPS. Helper scripts live in `scripts/vps/`.

1. [ ] Create deploy user `khepree` — `01-create-deploy-user.sh`
2. [ ] **Verify key login** in a new terminal (`ssh khepree@<ip>`)
3. [ ] Install Docker — `02-install-docker.sh`
4. [ ] Configure firewall (22/80/443 only) — `03-configure-firewall.sh`
5. [ ] Create `/etc/khepree/` secrets dir — `04-setup-secrets-dir.sh`
6. [ ] Enable automatic security updates — `05-enable-unattended-upgrades.sh`
7. [ ] (Optional) fail2ban — `06-install-fail2ban.sh`
8. [ ] Deploy stack with secrets outside git clone (see below)
9. [ ] **Verify key login again**, then harden SSH — `07-harden-ssh.sh --confirm-key-login`
10. [ ] Configure Cloudflare DNS + proxy (see below)
11. [ ] (Optional) Cloudflare Access on `admin.khepree.com` only

**Never run step 9 before steps 1–2 succeed.** Keep the current root session open until key login is confirmed after hardening.

---

## 1. Deployment user

Create a dedicated non-root user **`khepree`** for day-to-day operations. Do not run Docker or git pulls as root.

```bash
# On the VPS as root
cd /opt/khepree   # or your clone path
sudo bash scripts/vps/01-create-deploy-user.sh
```

The script:

- Creates `khepree` with `/bin/bash` home
- Installs your SSH public key from `/root/.ssh/authorized_keys` (override with `KHEPREE_SSH_PUBKEY_FILE`)
- Grants limited passwordless sudo for `docker`, `docker compose`, and `systemctl`
- Does **not** disable password or root SSH

After creation, test from your workstation:

```bash
ssh khepree@<server-ip>
sudo docker ps
```

---

## 2. SSH hardening

### Principles

- **Key authentication only** in production
- **Disable password authentication**
- **Disable direct root SSH** — use `khepree` + `sudo`
- **Do not lock yourself out** — verify key login before any hardening change

### Safe sequence

1. Run `01-create-deploy-user.sh`
2. Open a **second** terminal; confirm `ssh khepree@<ip>` works
3. Confirm `sudo` works for `khepree`
4. Only then run:

```bash
sudo bash scripts/vps/07-harden-ssh.sh --confirm-key-login
```

`07-harden-ssh.sh` refuses to run without `--confirm-key-login` and checks that `~khepree/.ssh/authorized_keys` is non-empty. It writes `/etc/ssh/sshd_config.d/99-khepree-hardening.conf`, runs `sshd -t`, and restarts sshd only after interactive confirmation (or `KHEPREE_VPS_YES=1`).

### Custom SSH port

If you change the SSH port, update **before** enabling the firewall:

```bash
# Edit /etc/ssh/sshd_config or a drop-in, then:
sudo systemctl restart ssh
SSH_PORT=2222 sudo bash scripts/vps/03-configure-firewall.sh
SSH_PORT=2222 sudo bash scripts/vps/06-install-fail2ban.sh   # if using fail2ban
```

---

## 3. Firewall

Only these ports should be reachable from the Internet:

| Port | Service |
|------|---------|
| 22/tcp (or your SSH port) | SSH |
| 80/tcp | HTTP — Caddy ACME + redirect |
| 443/tcp | HTTPS — Caddy |

**Do not expose** Postgres (`5432`), Redis (`6379`), or app ports (`3000`–`3004`). `compose.production.yml` keeps them on the internal Docker network; UFW provides a second layer on the host.

```bash
sudo SSH_PORT=22 bash scripts/vps/03-configure-firewall.sh
```

Verify:

```bash
sudo ufw status verbose
# Only 22, 80, 443 should be ALLOW
```

---

## 4. Docker Engine + Compose plugin

Install from Docker’s official apt repository (not the distro’s outdated package):

```bash
sudo bash scripts/vps/02-install-docker.sh
```

This installs `docker-ce`, `containerd`, Buildx, and the **Compose plugin** (`docker compose`). The `khepree` user is added to the `docker` group — log out and back in for group membership.

Verify:

```bash
docker --version
docker compose version
```

---

## 5. Automatic OS security updates

Enable unattended security updates (no automatic reboot by default):

```bash
sudo bash scripts/vps/05-enable-unattended-upgrades.sh
```

Review periodically:

```bash
sudo unattended-upgrades --dry-run --debug
```

Schedule a maintenance window for kernel updates that require reboot.

---

## 6. fail2ban (optional)

Recommended on a public VPS to slow SSH brute-force attempts. Does not replace key-only auth.

```bash
sudo SSH_PORT=22 bash scripts/vps/06-install-fail2ban.sh
sudo fail2ban-client status sshd
```

Tune `maxretry`, `findtime`, and `bantime` in `/etc/fail2ban/jail.d/khepree-sshd.local` if needed.

---

## 7. Docker security

### Host

- Run containers as the **`khepree` deploy user**, not root
- Do **not** mount `/var/run/docker.sock` into application containers
- Do **not** use `--privileged` for Khepree services
- Keep images updated; rebuild on security patches

### Compose / images (current baseline)

| Control | Status |
|---------|--------|
| App + worker containers run as non-root `khepree` user | Yes — see `docker/Dockerfile.app`, `docker/Dockerfile.outbox-worker` |
| Only Caddy publishes 80/443 | Yes — `compose.production.yml` |
| Postgres / Redis internal only | Yes — no `ports:` mapping |
| `privileged: true` | Not used |
| `docker.sock` mount | Not used |
| Log rotation | `json-file` max 10m × 5 files |
| Resource limits | `deploy.resources.limits` on all services |

### Further hardening (optional, not applied by default)

These can break Postgres/Redis or Caddy ACME if applied blindly — evaluate before enabling:

- `read_only: true` on stateless app containers (with `tmpfs` for `/tmp`)
- `cap_drop: [ALL]` + `cap_add` minimal set per service
- `security_opt: [no-new-privileges:true]`
- Separate VPS or managed DB instead of containerized Postgres for higher assurance

---

## 8. Secret directory

Production secrets must **not** live inside the git clone and must **not** be committed.

```bash
sudo bash scripts/vps/04-setup-secrets-dir.sh
# Or copy a filled file:
sudo bash scripts/vps/04-setup-secrets-dir.sh /path/to/.env.production
```

Target layout:

```
/etc/khepree/                 # drwx------ root:root
└── .env.production           # -rw------- root:root
```

Deploy using the secrets file explicitly:

```bash
cd /opt/khepree
docker compose -f compose.production.yml --env-file /etc/khepree/.env.production up -d
```

Clone the repo to e.g. `/opt/khepree` without `.env.production`. Use `.env.production.example` only as a template on your workstation.

---

## 9. Cloudflare

### When to set `TRUSTED_PROXY=cloudflare`

Set `TRUSTED_PROXY=cloudflare` in production **only when** HTTP traffic to the VPS passes through **Cloudflare’s proxy** (orange cloud). Khepree then trusts `CF-Connecting-IP` for client IP (rate limits, audit).

| DNS mode | Cloudflare icon | `TRUSTED_PROXY` |
|----------|-----------------|-----------------|
| Proxied | Orange cloud | `cloudflare` |
| DNS only | Grey cloud | `none` |

`compose.production.yml` defaults to `cloudflare` — if any hostname is grey-cloud, override to `none` or split stacks; do not trust Cloudflare headers for grey-cloud traffic.

### Recommended DNS records

Point all public app hostnames to the VPS IP (A/AAAA) or CNAME. Enable **proxied** (orange) for:

| Hostname | Proxy | Notes |
|----------|-------|-------|
| `khepree.com` | Proxied | Marketing |
| `www.khepree.com` | Proxied | Caddy redirects to apex |
| `account.khepree.com` | Proxied | Customer auth — **public** |
| `admin.khepree.com` | Proxied | Staff admin |
| `partner.khepree.com` | Proxied | Partner portal |
| `api.khepree.com` | Proxied | API + webhooks |

`cdn.khepree.com` points at R2/CDN, not this VPS — see `docs/DEPLOYMENT.md`.

### Cloudflare SSL/TLS

- Mode: **Full (strict)** — Caddy obtains Let’s Encrypt certs on the origin
- Enable “Always Use HTTPS” at Cloudflare edge (Caddy also redirects HTTP→HTTPS)

### Restrict origin access (recommended)

In Cloudflare → Security → WAF or IP Access Rules, allow **only Cloudflare IP ranges** to reach the VPS on 80/443. This prevents bypassing the CDN/proxy. Update when Cloudflare publishes new ranges.

---

## 10. Admin defense-in-depth

Khepree admin already requires staff RBAC and MFA at the application layer. For additional edge protection:

### Optional: Cloudflare Access on `admin.khepree.com`

- Create an Access application for `admin.khepree.com`
- Policy: allow your staff identity provider / email domain
- This adds an **extra gate before** traffic reaches Khepree

### Do **not** put `account.khepree.com` behind staff-only Access

Customers must sign in, checkout, and manage licenses without staff SSO. Staff-only Access on account would block legitimate users.

`partner.khepree.com` is for resellers — use partner RBAC in-app; Access is optional and must not use the same staff-only policy as admin unless partners are in that IdP group.

---

## Deploy workflow (reference)

```bash
# As khepree on the VPS
cd /opt/khepree
git pull
docker compose -f compose.production.yml --env-file /etc/khepree/.env.production build
docker compose -f compose.production.yml --env-file /etc/khepree/.env.production up -d
docker compose -f compose.production.yml ps
curl -sS https://khepree.com/healthz
curl -sS https://api.khepree.com/readyz
```

Migrations run automatically via the `migrate` one-shot service before apps start.

For schema releases, run `./scripts/backup/pre-migrate-backup.sh --require` first. See `docs/DATA-SAFETY.md`.

---

## Incident response (minimal)

| Event | Action |
|-------|--------|
| Suspected SSH compromise | Rotate keys, review `/var/log/auth.log`, ban IPs via fail2ban/UFW |
| Secret leak | Rotate all values in `/etc/khepree/.env.production`, redeploy, invalidate sessions |
| Container escape suspicion | Stop stack, patch host kernel/Docker, rebuild images from known-good commit |

---

## Script reference

| Script | Purpose |
|--------|---------|
| `scripts/vps/01-create-deploy-user.sh` | Create `khepree` user + SSH key |
| `scripts/vps/02-install-docker.sh` | Docker Engine + Compose plugin |
| `scripts/vps/03-configure-firewall.sh` | UFW: 22, 80, 443 only |
| `scripts/vps/04-setup-secrets-dir.sh` | `/etc/khepree/` permissions |
| `scripts/vps/05-enable-unattended-upgrades.sh` | Automatic security updates |
| `scripts/vps/06-install-fail2ban.sh` | Optional SSH brute-force mitigation |
| `scripts/vps/07-harden-ssh.sh` | Key-only SSH (requires `--confirm-key-login`) |

All scripts are idempotent where practical and refuse destructive SSH changes without explicit confirmation.
