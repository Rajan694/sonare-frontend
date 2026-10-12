# PowerShell version of updateFE.sh: pull, install what changed, then .\runFE.ps1 <target>
# (dev) or a production web build served locally (prod). Release builds come from
# ..\build.ps1 prod all, which bumps the versions on purpose.

Push-Location $PSScriptRoot
$ProgressPreference = 'SilentlyContinue'
try {

function Show-Usage {
    Write-Host "Usage: .\updateFE.ps1 [web|linux|mobile] [dev|prod] [--no-run]"
    Write-Host ""
    Write-Host "  dev (default)  Pull, install, then .\runFE.ps1 <target>: the web (default) or"
    Write-Host "                 desktop-window dev server, or mobile = Metro + the debug app"
    Write-Host "  prod           web only: pull, install, build the web app for production and serve"
    Write-Host "                 it on http://localhost:5183 (it talks to the production API)"
    Write-Host "  --no-run       Stop after installing (..\update.ps1 starts things itself)"
    Write-Host ""
    Write-Host "Refuses to pull over uncommitted changes. npm packages are reinstalled only where"
    Write-Host "package.json or package-lock.json changed (or node_modules is missing)."
    exit 1
}

$Target = 'web'
$Mode = 'dev'
$Run = $true
foreach ($a in $args) {
    switch ("$a") {
        { $_ -in 'web', 'linux', 'mobile' } { $Target = $_ }
        { $_ -in 'dev', 'prod' } { $Mode = $_ }
        '--no-run' { $Run = $false }
        default { Show-Usage }
    }
}
if ($Mode -eq 'prod' -and $Target -ne 'web') {
    Write-Host "prod is for the web app; release builds of the apps: ..\build.ps1 prod all"
    exit 1
}

function Invoke-Step([scriptblock]$Block) {
    & $Block
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# ---- pull ----
if (git status --porcelain --untracked-files=no) {
    Write-Host "Uncommitted changes here - commit or stash them before updating:"
    git status --short --untracked-files=no
    exit 1
}
$Branch = git rev-parse --abbrev-ref HEAD
if ($Branch -eq 'HEAD') { Write-Host 'Detached HEAD - check out a branch first.'; exit 1 }
$Before = git rev-parse HEAD
Write-Host "=== Pulling $Branch ==="
Invoke-Step { git pull --ff-only }
$After = git rev-parse HEAD
$Changed = if ($Before -ne $After) { @(git diff --name-only $Before $After) } else { @() }

# ---- install ----
function Install-Dir([string]$Dir) {
    $prefix = if ($Dir) { "$Dir/" } else { '' }
    $path = if ($Dir) { Join-Path $PSScriptRoot $Dir } else { $PSScriptRoot }
    if (-not (Test-Path (Join-Path $path 'node_modules')) -or
        $Changed -contains "${prefix}package.json" -or $Changed -contains "${prefix}package-lock.json") {
        Write-Host ""
        Write-Host "=== Installing packages in $(if ($Dir) { $Dir } else { 'the repo root' }) (npm ci) ==="
        Push-Location $path
        try { Invoke-Step { npm ci } } finally { Pop-Location }
    }
}

Install-Dir ''
if ($Target -eq 'mobile') { Install-Dir 'mobile' } else { Install-Dir 'desktop' }
# runFE.ps1 runs web and the desktop window through Neutralino.
if ($Target -ne 'mobile' -and -not (Test-Path desktop/bin)) {
    Write-Host ""
    Write-Host "=== Downloading the NeutralinoJS binaries ==="
    Push-Location desktop
    try { Invoke-Step { npx neu update } } finally { Pop-Location }
}

if (-not $Run) {
    Write-Host ""
    Write-Host "Frontend updated ($(git log -1 --format='%h %s'))."
    exit 0
}

# ---- run ----
Write-Host ""
if ($Mode -eq 'dev') {
    & .\runFE.ps1 $Target
    exit $LASTEXITCODE
}

Write-Host "=== Building the web app for production ==="
Push-Location desktop
try {
    $env:SONARE_ENV = 'prod'
    # npm run build's steps, called directly: PowerShell can drop the `--` in `npm run build -- ...`.
    Invoke-Step { npx tsc -b }
    Invoke-Step { npx vite build --sourcemap false }
    Write-Host ""
    Write-Host "=== Serving it on http://localhost:5183 (Ctrl+C stops it) ==="
    npx vite preview --port 5183 --strictPort
    exit $LASTEXITCODE
} finally {
    Remove-Item Env:SONARE_ENV -ErrorAction SilentlyContinue
    Pop-Location
}

} finally {
    Pop-Location
}
