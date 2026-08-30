#!/usr/bin/env bash
# Apply GFS retention on remote encrypted backups.
#
# Default policy (configurable via backup.env):
#   7 daily, 4 weekly, 3 monthly
#
# Usage:
#   ./postgres-retention.sh
#   BACKUP_RETENTION_DAILY=14 ./postgres-retention.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

load_env
command -v rclone >/dev/null || die "rclone not found"
[[ -n "${BACKUP_RCLONE_REMOTE}" ]] || die "BACKUP_RCLONE_REMOTE not set"

TMP_LIST="$(mktemp)"
trap 'rm -f "${TMP_LIST}"' EXIT

rclone lsf "${BACKUP_RCLONE_REMOTE}" --files-only | grep -E "^${BACKUP_FILENAME_PREFIX}-[0-9]{8}-[0-9]{6}\.dump\.gpg$" | sort > "${TMP_LIST}" || true

if [[ ! -s "${TMP_LIST}" ]]; then
  log "no remote backups found — nothing to prune"
  exit 0
fi

python3 - "${TMP_LIST}" "${BACKUP_RETENTION_DAILY}" "${BACKUP_RETENTION_WEEKLY}" "${BACKUP_RETENTION_MONTHLY}" "${BACKUP_RCLONE_REMOTE}" "${BACKUP_FILENAME_PREFIX}" <<'PY'
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone

list_file, daily_n, weekly_n, monthly_n, remote, prefix = sys.argv[1:7]
daily_n, weekly_n, monthly_n = int(daily_n), int(weekly_n), int(monthly_n)
pattern = re.compile(rf"^{re.escape(prefix)}-(\d{{8}})-(\d{{6}})\.dump\.gpg$")

backups = []
with open(list_file, encoding="utf-8") as fh:
    for line in fh:
        name = line.strip()
        m = pattern.match(name)
        if not m:
            continue
        dt = datetime.strptime(m.group(1) + m.group(2), "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
        backups.append((dt, name))

backups.sort(key=lambda x: x[0])
if not backups:
    sys.exit(0)

now = datetime.now(timezone.utc)
keep = set()

# Daily: newest N within last N calendar days
for day_offset in range(daily_n):
    day = (now - timedelta(days=day_offset)).date()
    candidates = [b for b in backups if b[0].date() == day]
    if candidates:
        keep.add(max(candidates, key=lambda x: x[0])[1])

# Weekly: newest per ISO week for last weekly_n weeks
for week_offset in range(weekly_n):
    target = now - timedelta(weeks=week_offset)
    iso = target.isocalendar()[:2]
    candidates = [b for b in backups if b[0].isocalendar()[:2] == iso]
    if candidates:
        keep.add(max(candidates, key=lambda x: x[0])[1])

# Monthly: newest per month for last monthly_n months
for month_offset in range(monthly_n):
    y = now.year
    m = now.month - month_offset
    while m <= 0:
        m += 12
        y -= 1
    candidates = [b for b in backups if b[0].year == y and b[0].month == m]
    if candidates:
        keep.add(max(candidates, key=lambda x: x[0])[1])

delete = [name for _, name in backups if name not in keep]
for name in delete:
    path = f"{remote}/{name}"
    print(f"[khepree-backup] deleting remote backup (retention): {name}", flush=True)
    subprocess.run(["rclone", "deletefile", path], check=True)

print(f"[khepree-backup] retention kept {len(keep)} backup(s), deleted {len(delete)}", flush=True)
PY

log "retention complete"
