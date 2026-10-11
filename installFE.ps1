# PowerShell version of installFE.sh.

$ScriptDir = $PSScriptRoot
Push-Location $ScriptDir
try {

function Invoke-Checked {
    $cmd, $rest = $args
    $global:LASTEXITCODE = 0
    & $cmd @rest
    # $? also catches a command that isn't installed, which leaves $LASTEXITCODE alone.
    if (-not $? -or $LASTEXITCODE -ne 0) { exit $(if ($LASTEXITCODE) { $LASTEXITCODE } else { 1 }) }
}

# installFE.sh switches to Node 22 with nvm; nvm-windows can't be driven from a script
# without an admin prompt, so just say when the node on PATH is a different one.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "Error: node is not installed (or not on PATH)."; exit 1 }
$nodeMajor = node -p "process.versions.node.split('.')[0]" 2>$null
if ("$nodeMajor" -ne '22') { Write-Host "Warning: this project expects Node 22; node on PATH is $(node -v 2>$null)." }

Write-Host "=== Installing the git hooks (husky + lint-staged) ==="
Invoke-Checked npm install

Write-Host ""
Write-Host "=== Installing mobile (React Native) packages ==="
Set-Location (Join-Path $ScriptDir 'mobile')
Invoke-Checked npm install

Write-Host ""
Write-Host "=== Installing desktop (React + TypeScript + NeutralinoJS) packages ==="
Set-Location (Join-Path $ScriptDir 'desktop')
Invoke-Checked npm install

Write-Host ""
Write-Host "=== Downloading NeutralinoJS binaries ==="
Invoke-Checked npx neu update

Write-Host ""
Write-Host "=== Building desktop once (creates resources/, needed for app + tray icons) ==="
Invoke-Checked npm run build

Write-Host ""
Write-Host "All packages installed."
exit 0

} catch {
    # A missing command throws here instead of setting $LASTEXITCODE.
    Write-Host ($_ | Out-String)
    exit 1
} finally { Pop-Location }
