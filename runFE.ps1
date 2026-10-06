# PowerShell version of runFE.sh.

$ScriptDir = $PSScriptRoot
$OnWindows = $env:OS -eq 'Windows_NT'
$ProgressPreference = 'SilentlyContinue'
Push-Location $ScriptDir
try {

function Show-Usage {
    Write-Host "Usage: .\runFE.ps1 <web|linux|windows|mobile> [options]"
    Write-Host ""
    Write-Host "Targets:"
    Write-Host "  web       Run NeutralinoJS in browser mode (Vite dev server on 5183 + HMR)"
    Write-Host "  linux     Run NeutralinoJS in window mode (Vite dev server on 5184 + HMR)."
    Write-Host "            Uses its own ports, so it can run alongside 'web'. On Windows it"
    Write-Host "            opens the Windows build's window."
    Write-Host "  windows   Build NeutralinoJS for Windows"
    Write-Host "  mobile    Start React Native Metro + Android"
    Write-Host ""
    Write-Host "Options (mobile only):"
    Write-Host "  --port <number>   Metro port (default 8081). Use this when 8081 is"
    Write-Host "                    already taken - the port is baked into the debug"
    Write-Host "                    APK, so it must be set here rather than by starting"
    Write-Host "                    Metro separately."
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\runFE.ps1 linux"
    Write-Host "  .\runFE.ps1 mobile"
    Write-Host "  .\runFE.ps1 mobile --port 8090"
    exit 1
}

if ($args.Count -eq 0) { Show-Usage }
$Target = "$($args[0])"
$Rest = @($args | Select-Object -Skip 1)

function Test-Url([string]$Url, [int]$TimeoutSec = 2) {
    try { $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec; $true } catch { $false }
}

# Kills a process started below, with its children (npx and the Vite/Metro node under it).
function Stop-Tree($Proc) {
    if (-not $Proc -or $Proc.HasExited) { return }
    if ($OnWindows) {
        taskkill /PID $Proc.Id /T /F *> $null
    } else {
        pkill -TERM -P $Proc.Id 2>$null
        Stop-Process -Id $Proc.Id -ErrorAction SilentlyContinue
    }
}

# Waits on a process in short sleeps, so Ctrl+C is handled straight away.
function Wait-Exit($Proc) {
    while (-not $Proc.HasExited) { Start-Sleep -Milliseconds 300 }
}

# runFE.sh switches to Node 22 with nvm; nvm-windows can't be driven from a script
# without an admin prompt, so just say when the node on PATH is a different one.
function Assert-Node {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "Error: node is not installed (or not on PATH)."; exit 1 }
    $major = node -p "process.versions.node.split('.')[0]" 2>$null
    if ("$major" -ne '22') { Write-Host "Warning: this project expects Node 22; node on PATH is $(node -v 2>$null)." }
}

# The React Native CLI shells out to a bare `adb`, and Gradle needs the SDK path.
# Neither works from a plain shell here, so resolve the SDK ourselves.
function Import-AndroidSdk {
    if (-not $env:ANDROID_HOME) {
        $candidates = @($env:ANDROID_SDK_ROOT)
        if ($env:LOCALAPPDATA) { $candidates += Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
        $candidates += (Join-Path $HOME 'Android/Sdk'), (Join-Path $HOME 'Android/sdk'), '/usr/lib/android-sdk', '/opt/android-sdk'
        foreach ($candidate in $candidates) {
            if ($candidate -and (Test-Path (Join-Path $candidate 'platform-tools'))) {
                $env:ANDROID_HOME = $candidate
                break
            }
        }
    }

    if (-not $env:ANDROID_HOME) {
        Write-Host "Error: Android SDK not found."
        Write-Host "Install it, or set ANDROID_HOME to your SDK directory."
        exit 1
    }

    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
    $sep = [IO.Path]::PathSeparator
    $env:PATH = (Join-Path $env:ANDROID_HOME 'platform-tools') + $sep + (Join-Path $env:ANDROID_HOME 'emulator') + $sep + $env:PATH
}

$MobileAppId = 'com.mobile'
# The Sonare backend (sonare-backend runBE.ps1); debug builds reach it at localhost:3010.
$BackendPort = 3010

# Debug builds reach Metro at the emulator's 10.0.2.2 alias by default, i.e. over the
# emulator's own network. Cutting that network to test Offline Mode then cut Metro too
# ("Cannot connect to Metro" / "Fast Refresh disconnected" popups), and Android 17 asks for
# local-network access to use the alias at all. Point the app's dev settings at
# localhost instead, carried over the adb link by `adb reverse`. Fails ($false) until the
# app is installed, since it writes into the app's own data directory.
function Set-AppMetroHost([int]$Port) {
    $remote = '/data/local/tmp/sonare_dev_prefs.xml'
    adb reverse "tcp:$Port" "tcp:$Port" *> $null
    if ($LASTEXITCODE -ne 0) { return $false }
    $local = [IO.Path]::GetTempFileName()
    try {
        $xml = "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>`n<map>`n" +
            "    <string name=`"debug_http_host`">localhost:$Port</string>`n</map>`n"
        [IO.File]::WriteAllText($local, $xml)
        adb push $local $remote *> $null
        if ($LASTEXITCODE -ne 0) { return $false }
    } finally {
        Remove-Item $local -Force -ErrorAction SilentlyContinue
    }
    adb shell "run-as $MobileAppId sh -c 'mkdir -p shared_prefs && cp $remote shared_prefs/${MobileAppId}_preferences.xml'" *> $null
    $ok = $LASTEXITCODE -eq 0
    adb shell rm -f $remote *> $null
    $ok
}

# `web` goes through `neu run`, which can only serve cli.frontendLibrary.devUrl (5183) and
# has Neutralino write .tmp/auth_info.json, where the dev server looks up its port. Two
# `neu run`s would fight over both, so the window build is started by hand on its own
# ports instead, and leaves auth_info.json to `web`.
$LinuxVitePort = 5184

function Start-WindowBuild {
    if ($OnWindows) {
        $binary = 'bin/neutralino-win_x64.exe'
    } else {
        $arch = uname -m
        switch ($arch) {
            'x86_64' { $binary = 'bin/neutralino-linux_x64' }
            { $_ -in 'aarch64', 'arm64' } { $binary = 'bin/neutralino-linux_arm64' }
            'armv7l' { $binary = 'bin/neutralino-linux_armhf' }
            default { Write-Host "Error: unsupported CPU '$arch'"; exit 1 }
        }
    }
    if (-not (Test-Path $binary)) {
        Write-Host "Error: $binary is missing - run .\installFE.ps1 first."
        exit 1
    }

    $viteUrl = "http://localhost:$LinuxVitePort/"
    if (Test-Url $viteUrl) {
        Write-Host "Error: port $LinuxVitePort is already in use - is another 'linux' run still open?"
        exit 1
    }

    # Chosen up front so the dev server can point the page's globals script at it.
    $nlPort = node -e "const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { console.log(s.address().port); s.close(); })"

    $vite = $null
    $window = $null
    try {
        $env:SONARE_VITE_PORT = "$LinuxVitePort"
        $env:SONARE_NL_PORT = "$nlPort"
        $vite = Start-Process -FilePath node -ArgumentList 'node_modules/vite/bin/vite.js' -NoNewWindow -PassThru
        Remove-Item Env:SONARE_VITE_PORT, Env:SONARE_NL_PORT

        for ($i = 0; $i -lt 60; $i++) {
            if (Test-Url $viteUrl) { break }
            Start-Sleep -Milliseconds 500
        }
        if (-not (Test-Url $viteUrl)) {
            Write-Host "Error: the dev server did not come up on port $LinuxVitePort."
            exit 1
        }

        # Waited on in short sleeps, so a Ctrl+C or ..\run.ps1 stopping this closes the
        # window too, instead of waiting for it to exit on its own.
        $window = Start-Process -FilePath (Resolve-Path $binary).ProviderPath -NoNewWindow -PassThru -ArgumentList `
            '--load-dir-res', '--path=.', "--port=$nlPort", "--url=http://localhost:$LinuxVitePort", '--window-enable-inspector=true'
        Wait-Exit $window
    } finally {
        Stop-Tree $window
        Stop-Tree $vite
    }
}

function Read-MobileArgs($List) {
    $port = ''
    for ($i = 0; $i -lt $List.Count; $i++) {
        $a = "$($List[$i])"
        if ($a -eq '--port') {
            $i++
            $port = "$($List[$i])"
        } elseif ($a -like '--port=*') {
            $port = $a.Substring('--port='.Length)
        } else {
            Write-Host "Error: Unknown option '$a' for target 'mobile'"
            Show-Usage
        }
    }
    if ($port -and $port -notmatch '^\d+$') {
        Write-Host "Error: --port expects a number, got '$port'"
        exit 1
    }
    $port
}

# `neu run`/`neu build` drive Vite themselves via cli.frontendLibrary in
# neutralino.config.json - don't start `npm run dev` separately, the dev server
# port is strict and neu waits for it.
switch ($Target) {
    'web' {
        if ($Rest.Count -gt 0) { Write-Host "Error: 'web' takes no options"; Show-Usage }
        Set-Location (Join-Path $ScriptDir 'desktop')
        # Quoted, or PowerShell drops the bare `--` before neu sees it.
        npx neu run '--' --mode=browser
        exit $LASTEXITCODE
    }
    'linux' {
        if ($Rest.Count -gt 0) { Write-Host "Error: 'linux' takes no options"; Show-Usage }
        Set-Location (Join-Path $ScriptDir 'desktop')
        Start-WindowBuild
        exit 0
    }
    'windows' {
        if ($Rest.Count -gt 0) { Write-Host "Error: 'windows' takes no options"; Show-Usage }
        Set-Location (Join-Path $ScriptDir 'desktop')
        npx neu build --release
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host "Build output in: desktop/dist/sonare-desktop/"
        exit 0
    }
    'mobile' {
        $metroPort = Read-MobileArgs $Rest
        Assert-Node
        Import-AndroidSdk
        Set-Location (Join-Path $ScriptDir 'mobile')

        $port = if ($metroPort) { $metroPort } else { '8081' }
        $statusUrl = "http://127.0.0.1:$port/status"

        function Test-Metro {
            try {
                $res = Invoke-WebRequest -Uri $statusUrl -UseBasicParsing -TimeoutSec 2
                "$($res.Content)" -match 'packager-status:running'
            } catch { $false }
        }

        # The RN CLI can only start Metro by opening a new terminal window, and
        # bails out ("no terminal app was specified") on a plain shell. Start it
        # ourselves instead, so this stays a single command everywhere.
        $metro = $null
        try {
            if (Test-Metro) {
                Write-Host "Reusing the Metro server already running on port $port."
            } else {
                Write-Host "Starting Metro on port $port..."
                $metro = Start-Process -FilePath node -ArgumentList 'node_modules/react-native/cli.js', 'start', '--port', $port -NoNewWindow -PassThru

                for ($i = 0; $i -lt 60; $i++) {
                    if (Test-Metro) { break }
                    Start-Sleep -Seconds 1
                }

                if (-not (Test-Metro)) {
                    Write-Host "Error: Metro did not come up on port $port."
                    Write-Host "Something else may be using it - try a different --port."
                    exit 1
                }
            }

            # Build the bundle before the app launches. The app only waits a couple of
            # seconds for Metro and otherwise falls back to the (absent) asset bundle,
            # which surfaces as a red "Unable to load script" box.
            Write-Host "Warming the JS bundle..."
            try {
                $null = Invoke-WebRequest -Uri "http://127.0.0.1:$port/index.bundle?platform=android&dev=true&minify=false" -UseBasicParsing -TimeoutSec 600
            } catch { }

            # Debug builds call the backend at localhost:3010 (mobile/src/data/config.ts); carry
            # that over the adb link too, so the emulator and a USB phone both reach this machine.
            adb reverse "tcp:$BackendPort" "tcp:$BackendPort" *> $null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Note: could not forward port $BackendPort to the device (is one attached?)."
                Write-Host "      Without it the app can't reach the backend; on Wi-Fi only, set the"
                Write-Host "      computer's LAN address in the app under Settings -> Server address."
            }

            # Already installed: point it at localhost before it launches. A fresh install
            # has no data directory yet, so it gets pointed right after and restarted.
            $metroHostSet = Set-AppMetroHost $port
            if (-not $metroHostSet) {
                # Only this first launch goes through 10.0.2.2, which Android 17 (SDK 37) gates.
                Write-Host "Note: if the app asks for local-network access on first launch, tap Allow."
                Write-Host "      Declining it leaves a red `"Unable to load script`" box."
            }

            # Native code (Reanimated, Worklets, Screens, SVG...) is C++ compiled once per ABI.
            # gradle.properties lists all four for release builds; a dev run only needs the
            # attached device's, which cuts the native build to a quarter.
            npx react-native run-android --no-packager --port $port --active-arch-only

            if (-not $metroHostSet -and (Set-AppMetroHost $port)) {
                adb shell am force-stop $MobileAppId
                adb shell am start -n "$MobileAppId/.MainActivity" *> $null
            }

            if ($metro) {
                Write-Host ""
                Write-Host "Metro is running on port $port. Press Ctrl+C to stop it."
                Wait-Exit $metro
            }
        } finally {
            Stop-Tree $metro
        }
        exit 0
    }
    default {
        Write-Host "Error: Unknown target '$Target'"
        Show-Usage
    }
}

} catch {
    # A missing command throws here instead of setting $LASTEXITCODE.
    Write-Host ($_ | Out-String)
    exit 1
} finally { Pop-Location }
