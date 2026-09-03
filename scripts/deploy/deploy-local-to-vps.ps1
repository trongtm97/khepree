# Khepree - build Docker images locally, transfer via docker save/load, deploy on shared VPS.
# Does NOT upload .env.production from local. Does NOT run docker build on VPS.
#
# VPS 4-6GB RAM - do NOT build on server. See docs/SHARED-VPS-DEPLOYMENT.md
#
# Usage:
#   $env:VPS_USER = "deploy"
#   $env:VPS_HOST = "14.225.211.205"
#   $env:VPS_PASSWORD = "..."   # optional; uses plink/pscp when set
#   powershell -ExecutionPolicy Bypass -File scripts\deploy\deploy-local-to-vps.ps1
#
# Bootstrap only (dirs + compose + env template):
#   ... -BootstrapOnly
#
# Rollback:
#   ... -Rollback

[CmdletBinding()]
param(
    [string]$VpsUser = $env:VPS_USER,
    [string]$VpsHost = $env:VPS_HOST,
    [string]$VpsPassword = $env:VPS_PASSWORD,
    [string]$VpsPath = $(if ($env:VPS_PATH) { $env:VPS_PATH } else { "/opt/khepree/app" }),
    [string]$EnvFile = "/etc/khepree/.env.production",
    [string]$ComposeFile = "compose.shared-vps.yml",
    [string]$HostKey = "SHA256:wHtOELkptJsbHY5zeNgF+8VnJ3vsEgFW50rsZFFkvQM",
    [int]$SshPort = 22,
    [string]$DeployTag = $(Get-Date -Format "yyyyMMdd-HHmmss"),
    [switch]$BootstrapOnly,
    [switch]$Rollback,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$SshTarget = "${VpsUser}@${VpsHost}"
$RollbackFile = "$VpsPath/.deploy-rollback-images"
$ArchiveLocal = Join-Path $RepoRoot ".deploy-khepree-${DeployTag}.tar.gz"
$ArchiveRemote = "$VpsPath/images/$(Split-Path $ArchiveLocal -Leaf)"

$ImageNames = @(
    "khepree-web",
    "khepree-account",
    "khepree-admin",
    "khepree-partner",
    "khepree-api",
    "khepree-migrate",
    "khepree-outbox-worker"
)

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Get-SshBaseArgs() {
    if ($VpsPassword) {
        return @("-batch", "-hostkey", $HostKey, "-ssh", "-P", "$SshPort", "-l", $VpsUser, "-pw", $VpsPassword, $VpsHost)
    }
    return @("-p", $SshPort, "-o", "StrictHostKeyChecking=accept-new", $SshTarget)
}

function Invoke-Ssh([string]$RemoteCommand) {
    if ($VpsPassword) {
        & plink @((Get-SshBaseArgs)) $RemoteCommand
    } else {
        & ssh @((Get-SshBaseArgs)) $RemoteCommand
    }
    if ($LASTEXITCODE -ne 0) { throw "SSH command failed (exit $LASTEXITCODE)" }
}

function Invoke-SshBash([string]$Script) {
    $normalized = $Script -replace "`r`n", "`n" -replace "`r", "`n"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
    $b64 = [Convert]::ToBase64String($bytes)
    Invoke-Ssh "echo $b64 | base64 -d | bash"
}

function Invoke-RemoteScript([string]$ScriptName, [hashtable]$EnvVars) {
    $localScript = Join-Path $RepoRoot "scripts/deploy/vps-remote/$ScriptName"
    if (-not (Test-Path $localScript)) { throw "Missing remote script: $localScript" }
    $remoteScript = "$VpsPath/vps-remote/$ScriptName"
    Invoke-Ssh "mkdir -p '$VpsPath/vps-remote'"
    Invoke-Scp $localScript $remoteScript
    $sq = [char]39
    $exports = ($EnvVars.GetEnumerator() | ForEach-Object {
        $escaped = $_.Value.Replace("$sq", "$sq\$sq")
        "export $($_.Key)=$sq$escaped$sq;"
    }) -join " "
    Invoke-SshBash "${exports} chmod +x '$remoteScript'; '$remoteScript'"
}

function Invoke-Scp([string]$LocalPath, [string]$RemotePath) {
    if ($VpsPassword) {
        & pscp -batch -hostkey $HostKey -P $SshPort -pw $VpsPassword $LocalPath "${SshTarget}:${RemotePath}"
    } else {
        & scp -P $SshPort -o StrictHostKeyChecking=accept-new $LocalPath "${SshTarget}:${RemotePath}"
    }
    if ($LASTEXITCODE -ne 0) { throw "scp failed (exit $LASTEXITCODE)" }
}

function Save-DockerImageGzip([string[]]$Tags, [string]$OutputPath) {
    $tarPath = $OutputPath -replace '\.gz$', ''
    if (Test-Path $tarPath) { Remove-Item $tarPath -Force }
    if (Test-Path $OutputPath) { Remove-Item $OutputPath -Force }

    & docker save @Tags -o $tarPath
    if ($LASTEXITCODE -ne 0) { throw "docker save failed" }

    if (Get-Command gzip -ErrorAction SilentlyContinue) {
        & gzip -f $tarPath
        Move-Item -Force "${tarPath}.gz" $OutputPath
        return
    }

    $inStream = [System.IO.File]::OpenRead($tarPath)
    try {
        $outStream = [System.IO.File]::Create($OutputPath)
        try {
            $gzip = New-Object System.IO.Compression.GZipStream(
                $outStream,
                [System.IO.Compression.CompressionMode]::Compress
            )
            try { $inStream.CopyTo($gzip) } finally { $gzip.Dispose() }
        } finally { $outStream.Dispose() }
    } finally {
        $inStream.Dispose()
        Remove-Item $tarPath -Force
    }
}

function Build-KhepreeImages([string]$TagProduction, [string]$TagDeploy) {
    $dbUrl = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "postgresql://khepree:khepree_local@127.0.0.1:5434/khepree_local" }
    $cdnUrl = if ($env:S3_PUBLIC_BASE_URL) { $env:S3_PUBLIC_BASE_URL } else { "https://cdn.khepree.com" }
    $s3Endpoint = if ($env:S3_ENDPOINT) { $env:S3_ENDPOINT } else { "https://s3.vn-hcm-1.vietnix.cloud" }
    $s3Region = if ($env:S3_REGION) { $env:S3_REGION } else { "vn-hcm-1" }
    $s3PublicBucket = if ($env:S3_BUCKET_PUBLIC) { $env:S3_BUCKET_PUBLIC } else { "khepree-public" }
    $s3PrivateBucket = if ($env:S3_BUCKET_PRIVATE) { $env:S3_BUCKET_PRIVATE } else { "khepree-private" }
    $s3AccessKey = if ($env:S3_ACCESS_KEY_ID) { $env:S3_ACCESS_KEY_ID } else { "build-only-not-for-runtime" }
    $s3SecretKey = if ($env:S3_SECRET_ACCESS_KEY) { $env:S3_SECRET_ACCESS_KEY } else { "build-only-not-for-runtime" }

    Write-Step "Migrate database for SSG build ($dbUrl)"
    Push-Location $RepoRoot
    try {
        $env:DATABASE_URL = $dbUrl
        & pnpm db:migrate
        if ($LASTEXITCODE -ne 0) { throw "pnpm db:migrate failed - start local Postgres or set DATABASE_URL" }
    } finally {
        Pop-Location
    }

    $apps = @(
        @{ Image = "khepree-web"; AppName = "web"; Filter = "@khepree/web"; Port = "3000" },
        @{ Image = "khepree-account"; AppName = "account"; Filter = "@khepree/account"; Port = "3001" },
        @{ Image = "khepree-admin"; AppName = "admin"; Filter = "@khepree/admin"; Port = "3002" },
        @{ Image = "khepree-partner"; AppName = "partner"; Filter = "@khepree/partner"; Port = "3003" },
        @{ Image = "khepree-api"; AppName = "api"; Filter = "@khepree/api"; Port = "3004" }
    )

    Push-Location $RepoRoot
    try {
        foreach ($app in $apps) {
            Write-Host "Building $($app.Image)..." -ForegroundColor Yellow
            & docker build `
                --network host `
                -t "$($app.Image):$TagDeploy" `
                -t "$($app.Image):$TagProduction" `
                -f docker/Dockerfile.app `
                --build-arg "APP_NAME=$($app.AppName)" `
                --build-arg "APP_FILTER=$($app.Filter)" `
                --build-arg "PORT=$($app.Port)" `
                --build-arg "DATABASE_URL=$dbUrl" `
                --build-arg "S3_PUBLIC_BASE_URL=$cdnUrl" `
                --build-arg "STORAGE_PROVIDER=s3" `
                --build-arg "S3_ENDPOINT=$s3Endpoint" `
                --build-arg "S3_REGION=$s3Region" `
                --build-arg "S3_ACCESS_KEY_ID=$s3AccessKey" `
                --build-arg "S3_SECRET_ACCESS_KEY=$s3SecretKey" `
                --build-arg "S3_BUCKET_PUBLIC=$s3PublicBucket" `
                --build-arg "S3_BUCKET_PRIVATE=$s3PrivateBucket" `
                --build-arg "S3_FORCE_PATH_STYLE=true" `
                .
            if ($LASTEXITCODE -ne 0) { throw "docker build failed for $($app.Image)" }
        }

        Write-Host "Building khepree-migrate..." -ForegroundColor Yellow
        & docker build -t "khepree-migrate:${TagDeploy}" -t "khepree-migrate:${TagProduction}" -f docker/Dockerfile.migrate .
        if ($LASTEXITCODE -ne 0) { throw "docker build failed for khepree-migrate" }

        Write-Host "Building khepree-outbox-worker..." -ForegroundColor Yellow
        & docker build -t "khepree-outbox-worker:${TagDeploy}" -t "khepree-outbox-worker:${TagProduction}" -f docker/Dockerfile.outbox-worker .
        if ($LASTEXITCODE -ne 0) { throw "docker build failed for khepree-outbox-worker" }
    } finally {
        Pop-Location
    }
}

function Bootstrap-Vps {
    Write-Step "Bootstrap VPS paths and compose file"
    $sharedVps = ($ComposeFile -eq "compose.shared-vps.yml")
    Invoke-SshBash @"
set -euo pipefail
sudo mkdir -p '$VpsPath' '$VpsPath/images' '$VpsPath/docker' /etc/khepree
sudo chown deploy:deploy '$VpsPath' '$VpsPath/images' '$VpsPath/docker'
sudo chown root:deploy /etc/khepree
sudo chmod 750 /etc/khepree
"@
    if ($sharedVps) {
        Invoke-Ssh "docker network inspect chapmee_chapmee_net >/dev/null"
    }

    $composeLocal = Join-Path $RepoRoot $ComposeFile
    if (-not (Test-Path $composeLocal)) { throw "Missing $composeLocal" }
    Invoke-Scp $composeLocal "$VpsPath/$ComposeFile"

    foreach ($envName in @(".env.example", ".env.production.example")) {
        $envLocal = Join-Path $RepoRoot $envName
        if (Test-Path $envLocal) { Invoke-Scp $envLocal "$VpsPath/$envName" }
    }

    $snippetLocal = Join-Path $RepoRoot "docker/Caddyfile.shared-vps.snippet"
    if (Test-Path $snippetLocal) {
        Invoke-Scp $snippetLocal "$VpsPath/Caddyfile.shared-vps.snippet"
    }

    $envExists = ""
    if ($VpsPassword) {
        $envExists = (& plink @((Get-SshBaseArgs)) "if test -f '$EnvFile'; then echo EXISTS; else echo MISSING; fi")
    } else {
        $envExists = (& ssh @((Get-SshBaseArgs)) "if test -f '$EnvFile'; then echo EXISTS; else echo MISSING; fi")
    }
    if ($envExists -match "MISSING") {
        Write-Step "Generate /etc/khepree/.env.production on VPS (run scripts/deploy/bootstrap-vps-env.sh locally first if you need custom secrets)"
        $bootstrapScript = Join-Path $RepoRoot "scripts/deploy/bootstrap-vps-env.sh"
        if (Test-Path $bootstrapScript) {
            Invoke-Scp $bootstrapScript "$VpsPath/bootstrap-vps-env.sh"
            Invoke-SshBash @"
set -euo pipefail
chmod +x '$VpsPath/bootstrap-vps-env.sh'
sudo '$VpsPath/bootstrap-vps-env.sh' '$EnvFile'
sudo chown root:deploy '$EnvFile'
sudo chmod 640 '$EnvFile'
"@
        } else {
            Write-Host "WARN: $bootstrapScript not found - create $EnvFile manually" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Env file already exists: $EnvFile"
    }

    if ($sharedVps) {
        Write-Step "Append Khepree Caddy blocks (if not present)"
        Invoke-RemoteScript "append-caddy.sh" @{ VPS_PATH = $VpsPath }
    } else {
        $caddyLocal = Join-Path $RepoRoot "docker/Caddyfile"
        if (-not (Test-Path $caddyLocal)) { throw "Missing $caddyLocal" }
        Invoke-Scp $caddyLocal "$VpsPath/docker/Caddyfile"
    }
}

Assert-Command docker
if ($VpsPassword) {
    Assert-Command plink
    Assert-Command pscp
} else {
    Assert-Command ssh
    Assert-Command scp
}

if ([string]::IsNullOrWhiteSpace($VpsUser) -or [string]::IsNullOrWhiteSpace($VpsHost)) {
    throw "Set VPS_USER and VPS_HOST (optional VPS_PASSWORD for plink/pscp auth)."
}

$TagProduction = "production"

if ($BootstrapOnly) {
    Bootstrap-Vps
    Write-Host "Bootstrap complete." -ForegroundColor Green
    exit 0
}

if ($Rollback) {
    Write-Step "Rollback on VPS using $RollbackFile"
    Invoke-RemoteScript "rollback.sh" @{
        VPS_PATH       = $VpsPath
        ENV_FILE       = $EnvFile
        COMPOSE_FILE   = $ComposeFile
        ROLLBACK_FILE  = $RollbackFile
    }
    Write-Host "Rollback complete." -ForegroundColor Green
    exit 0
}

Bootstrap-Vps

Write-Step "Verify VPS paths"
Invoke-Ssh "test -d '$VpsPath'"
Invoke-Ssh "test -f '$VpsPath/$ComposeFile'"
Invoke-Ssh "test -f '$EnvFile'"
Invoke-Ssh "mkdir -p '$VpsPath/images'"

if ($SkipBuild) {
    Write-Step "Skip build - using existing *:$TagProduction tags"
    foreach ($name in $ImageNames) {
        docker image inspect "${name}:${TagProduction}" 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Image ${name}:${TagProduction} not found locally" }
        docker tag "${name}:${TagProduction}" "${name}:deploy-${DeployTag}"
    }
} else {
    Write-Step "Build all Khepree images locally (deploy-$DeployTag + $TagProduction)"
    Build-KhepreeImages $TagProduction "deploy-$DeployTag"
}

$allTags = @()
foreach ($name in $ImageNames) {
    $allTags += "${name}:deploy-${DeployTag}"
    $allTags += "${name}:${TagProduction}"
}

Write-Step "Save images to $ArchiveLocal"
Save-DockerImageGzip $allTags $ArchiveLocal
$sizeMb = [math]::Round((Get-Item $ArchiveLocal).Length / 1MB, 2)
Write-Host "Archive size: ${sizeMb} MB"

Write-Step "Upload archive"
Invoke-Scp $ArchiveLocal $ArchiveRemote

Write-Step "Load images on VPS + record rollback"
Invoke-RemoteScript "load-images.sh" @{
    VPS_PATH        = $VpsPath
    TAG             = $TagProduction
    DEPLOY_TAG      = $DeployTag
    ROLLBACK_FILE   = $RollbackFile
    ARCHIVE_REMOTE  = $ArchiveRemote
}

Write-Step "Pull base images on VPS (postgres, redis, caddy)"
Invoke-Ssh "docker pull postgres:17-alpine; docker pull redis:7.4.2-alpine; docker pull caddy:2.9.1-alpine"

Write-Step "Update image tags in env + docker compose up (NO --build)"
Invoke-RemoteScript "compose-up.sh" @{
    VPS_PATH     = $VpsPath
    ENV_FILE     = $EnvFile
    COMPOSE_FILE = $ComposeFile
    TAG          = $TagProduction
}

Write-Step "Verify containers"
Start-Sleep -Seconds 15
Invoke-Ssh "docker ps --filter name=khepree --format 'table {{.Names}}\t{{.Status}}'"
try {
    Invoke-Ssh "docker exec khepree-api wget -qO- http://127.0.0.1:3004/healthz"
    Write-Host "API healthz: OK" -ForegroundColor Green
} catch {
    Write-Host "API health check pending - check logs:" -ForegroundColor Yellow
    Write-Host "  plink ... 'docker logs khepree-api --tail 50'"
}

if (Test-Path $ArchiveLocal) { Remove-Item $ArchiveLocal -Force }

Write-Host ""
Write-Host "Deploy OK - tag deploy-$DeployTag" -ForegroundColor Green
Write-Host "Rollback: deploy-local-to-vps.ps1 -Rollback"
Write-Host "Logs: ssh $SshTarget 'docker compose -f $VpsPath/$ComposeFile --env-file $EnvFile logs -f'"
