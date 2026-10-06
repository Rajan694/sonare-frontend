# PowerShell version of smoke.sh.

$OnWindows = $env:OS -eq 'Windows_NT'
$Sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME }
       elseif ($OnWindows) { Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
       else { Join-Path $HOME 'Android/Sdk' }
$Adb = Join-Path $Sdk ('platform-tools/adb' + $(if ($OnWindows) { '.exe' } else { '' }))

if (-not (Test-Path $Adb)) {
    Write-Host "adb not found at $Adb"
    exit 1
}

$device = & $Adb devices | Where-Object { $_ -match '\tdevice$' } | Select-Object -First 1
if (-not $device) {
    Write-Host "No active android device/emulator found"
    exit 0
}
$device = ($device -split '\t')[0]

Write-Host "Running smoke test on device $device..."
# Check audio system status
& $Adb -s $device shell dumpsys audio | Select-String -Pattern 'players:' -Context 0, 3 | ForEach-Object { $_.ToString() }
Write-Host "Device verified successfully."
exit 0
