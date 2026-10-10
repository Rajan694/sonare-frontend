# PowerShell version of buildFE.sh.
#
# Builds the installable apps: the Android APK, Linux packages, the Windows .exe and the web
# bundle. The results go to dist/releases/, named so the admin page (Releases) can read the
# platform and version off the file name when they are uploaded.
#
# On Windows the Linux .deb and .AppImage are skipped (dpkg-deb and appimagetool are Linux
# tools); the Linux .tar.gz is still built, with the binary marked executable.

$ScriptDir = $PSScriptRoot
$OnWindows = $env:OS -eq 'Windows_NT'
$Desktop = Join-Path $ScriptDir 'desktop'
$Mobile = Join-Path $ScriptDir 'mobile'

function Show-Usage {
    Write-Host "Usage: .\buildFE.ps1 <dev|prod> <platform>... [version] [--formats=LIST] [--out=DIR]"
    Write-Host ""
    Write-Host "Environment (first):"
    Write-Host "  dev       Desktop and web builds use VITE_API_BASE (desktop/.env); files get '-dev'"
    Write-Host "  prod      Desktop and web builds use VITE_API_BASE_PROD - the ones to upload"
    Write-Host "            Android is a release build against the production API either way; a dev"
    Write-Host "            APK also allows plain http, for a server on the LAN (Settings -> Server address)."
    Write-Host ""
    Write-Host "Platforms (one or more):"
    Write-Host "  android   Release APKs: arm64 (phones - the one to upload) and x86_64 (the emulator)"
    Write-Host "  linux     Linux x64 packages: .tar.gz, .deb, and .AppImage when appimagetool is installed"
    Write-Host "            (on Windows only the .tar.gz)"
    Write-Host "  windows   Windows x64 .exe (one file, the app's resources embedded)"
    Write-Host "  web       The web app as a .tar.gz, for a web server"
    Write-Host "  all       All of the above"
    Write-Host ""
    Write-Host "Version (optional, x.y.z):"
    Write-Host "  Given     It becomes the version of what is built."
    Write-Host "  Left out  The patch number goes up by one (1.0.0 -> 1.0.1)."
    Write-Host "  Desktop, web, Linux and Windows share desktop/neutralino.config.json's version;"
    Write-Host "  Android has its own (versionName in mobile/android/app/build.gradle), and its"
    Write-Host "  versionCode goes up on every build so phones take it as an update. A lower"
    Write-Host "  version than the current one is refused; if the build fails, the version"
    Write-Host "  files are put back."
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  --formats=LIST   Linux formats, comma-separated: tar.gz,deb,appimage (default: all)"
    Write-Host "  --out=DIR        Where the builds go (default: dist/releases)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\buildFE.ps1 prod android            # 1.0.1 -> 1.0.2, versionCode +1"
    Write-Host "  .\buildFE.ps1 prod linux windows 1.2.0"
    Write-Host "  .\buildFE.ps1 dev linux --formats=deb"
    exit 1
}

$BuildEnv = ''
$Targets = New-Object Collections.Generic.List[string]
$Version = ''
$Formats = 'tar.gz,deb,appimage'
$Out = Join-Path $ScriptDir 'dist/releases'
foreach ($raw in $args) {
    # PowerShell hands `--formats=a,b` over as an array; put the commas back.
    $arg = if ($raw -is [array]) { $raw -join ',' } else { "$raw" }
    if ($arg -in 'dev', 'prod') {
        if ($BuildEnv) { Write-Host "Error: the environment is given twice ($BuildEnv, $arg)"; exit 1 }
        $BuildEnv = $arg
    } elseif ($arg -in 'android', 'linux', 'windows', 'web') {
        $Targets.Add($arg)
    } elseif ($arg -eq 'all') {
        $Targets.AddRange([string[]]('android', 'linux', 'windows', 'web'))
    } elseif ($arg -match '^[0-9]') {
        if ($arg -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$') { Write-Host "Error: the version must look like 1.2.0, not '$arg'"; exit 1 }
        if ($Version) { Write-Host "Error: the version is given twice ($Version, $arg)"; exit 1 }
        $Version = $arg
    } elseif ($arg -like '--formats=*') {
        $Formats = $arg.Substring('--formats='.Length)
    } elseif ($arg -like '--out=*') {
        $Out = $arg.Substring('--out='.Length)
    } elseif ($arg -in '-h', '--help') {
        Show-Usage
    } else {
        Write-Host "Error: unknown argument '$arg'"
        Write-Host ""
        Show-Usage
    }
}
if ($args.Count -eq 0) { Show-Usage }
if (-not $BuildEnv) { Write-Host "Error: say which environment first: .\buildFE.ps1 <dev|prod> <platform>..."; exit 1 }
if ($Targets.Count -eq 0) { Write-Host "Error: say which platform: android, linux, windows, web or all"; exit 1 }
New-Item -ItemType Directory -Force $Out | Out-Null
$Out = (Resolve-Path $Out).ProviderPath

function Test-Target($Name) { $Targets -contains $Name }

# Runs a native command and stops the build if it fails, like `set -e`.
function Invoke-Checked {
    $cmd, $rest = $args
    $global:LASTEXITCODE = 0
    & $cmd @rest
    # $? also catches a command that isn't installed, which leaves $LASTEXITCODE alone.
    if (-not $? -or $LASTEXITCODE -ne 0) { exit $(if ($LASTEXITCODE) { $LASTEXITCODE } else { 1 }) }
}

function New-TempDir {
    $dir = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory $dir | Out-Null
    $dir
}

function Read-Text($Path) { [IO.File]::ReadAllText($Path) }
function Write-Text($Path, $Text) { [IO.File]::WriteAllText($Path, $Text, (New-Object Text.UTF8Encoding $false)) }

# buildFE.sh switches to Node 22 with nvm; nvm-windows can't be driven from a script
# without an admin prompt, so just say when the node on PATH is a different one.
function Assert-Node {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "Error: node is not installed (or not on PATH)."; exit 1 }
    $major = node -p "process.versions.node.split('.')[0]" 2>$null
    if ("$major" -ne '22') { Write-Host "Warning: this project expects Node 22; node on PATH is $(node -v 2>$null)." }
}

# Dev builds say so in their name, so one is never uploaded by mistake.
function Get-Suffix { if ($BuildEnv -eq 'dev') { '-dev' } else { '' } }

$Built = New-Object Collections.Generic.List[string]

# ---- versions ---------------------------------------------------------------------------

$NeuConfig = Join-Path $Desktop 'neutralino.config.json'
$Gradle = Join-Path $Mobile 'android/app/build.gradle'

function Get-FirstMatch($Path, $Pattern) {
    $m = [regex]::Match((Read-Text $Path), $Pattern)
    if ($m.Success) { $m.Groups[1].Value } else { '' }
}
function Get-DesktopVersion { Get-FirstMatch $NeuConfig '(?m)^  "version": "([^"]*)",' }
function Get-AndroidVersion { Get-FirstMatch $Gradle '(?m)^[ \t]*versionName "([^"]*)"' }
function Get-AndroidCode { Get-FirstMatch $Gradle '(?m)^[ \t]*versionCode ([0-9]+)' }

function ConvertTo-Version($Text) {
    $parts = @($Text.Split('.') | ForEach-Object { [int]$_ })
    while ($parts.Count -lt 3) { $parts += 0 }
    New-Object Version $parts[0], $parts[1], $parts[2]
}

# 1.0 -> 1.0.1, 1.2.3 -> 1.2.4
function Get-BumpedPatch($Text) {
    $v = ConvertTo-Version $Text
    "$($v.Major).$($v.Minor).$($v.Build + 1)"
}

# Copies of the version files, put back if the build fails.
$script:Backup = ''
$Changed = New-Object Collections.Generic.List[string]

function Backup-VersionFile($Path) {
    if (-not $script:Backup) { $script:Backup = New-TempDir }
    Copy-Item $Path (Join-Path $script:Backup (Split-Path $Path -Leaf))
    $Changed.Add($Path)
}

function Restore-VersionFiles {
    foreach ($f in $Changed) { Copy-Item (Join-Path $script:Backup (Split-Path $f -Leaf)) $f -Force }
}

# Picks each app's new version (given, or the patch bumped) and writes it before building.
function Set-Versions {
    if ((Test-Target linux) -or (Test-Target windows) -or (Test-Target web)) {
        $current = Get-DesktopVersion
        if (-not $current) { Write-Host "Error: no version in $NeuConfig"; exit 1 }
        $next = if ($Version) { $Version } else { Get-BumpedPatch $current }
        if ((ConvertTo-Version $next) -lt (ConvertTo-Version $current)) {
            Write-Host "Error: desktop is already at $current; $next would be a step back."; exit 1
        }
        if ($next -eq $current) {
            Write-Host "Desktop/web version: $current (unchanged, a rebuild)"
        } else {
            Backup-VersionFile $NeuConfig
            $re = New-Object regex '(?m)^  "version": "[^"]*",'
            Write-Text $NeuConfig ($re.Replace((Read-Text $NeuConfig), "  `"version`": `"$next`",", 1))
            Write-Host "Desktop/web version: $current -> $next"
        }
    }
    if (Test-Target android) {
        $current = Get-AndroidVersion
        $code = Get-AndroidCode
        if (-not $current -or -not $code) { Write-Host "Error: no versionName/versionCode in $Gradle"; exit 1 }
        $next = if ($Version) { $Version } else { Get-BumpedPatch $current }
        if ((ConvertTo-Version $next) -lt (ConvertTo-Version $current)) {
            Write-Host "Error: Android is already at $current; $next would be a step back."; exit 1
        }
        $newCode = [int]$code + 1
        Backup-VersionFile $Gradle
        $text = Read-Text $Gradle
        $text = [regex]::Replace($text, '(?m)^([ \t]*)versionName "[^"]*"', "`${1}versionName `"$next`"")
        $text = [regex]::Replace($text, '(?m)^([ \t]*)versionCode [0-9]+', "`${1}versionCode $newCode")
        Write-Text $Gradle $text
        Write-Host "Android version:     $current -> $next (versionCode $code -> $newCode)"
    }
}

# ---- desktop (Linux, Windows) and web ---------------------------------------------------

# Builds run in a copy of desktop/ (node_modules linked in), so they never touch the dev
# setup: `neu build` packs and then empties .tmp, where a running `.\runFE.ps1 web` keeps
# its auth token, and rewrites resources/ and dist/.
$script:Stage = ''

function Remove-Stage {
    if (-not $script:Stage) { return }
    # Unlink node_modules first: Windows PowerShell's Remove-Item -Recurse follows a
    # junction and would empty the real desktop/node_modules.
    $link = Join-Path $script:Stage 'desktop/node_modules'
    if (Test-Path $link) {
        if ($OnWindows) { cmd /c rmdir "$link" } else { rm "$link" }
    }
    Remove-Item -Recurse -Force $script:Stage -ErrorAction SilentlyContinue
    $script:Stage = ''
}

function Initialize-Stage {
    if ($script:Stage) { return }
    $script:Stage = New-TempDir
    $dest = Join-Path $script:Stage 'desktop'
    New-Item -ItemType Directory $dest | Out-Null
    $skip = 'node_modules', '.tmp', '.storage', 'dist', 'resources', 'test-results', 'playwright-report'
    Get-ChildItem -LiteralPath $Desktop -Force |
        Where-Object { $_.Name -notin $skip -and $_.Name -notlike '*.log' } |
        Copy-Item -Destination $dest -Recurse -Force
    $linkType = if ($OnWindows) { 'Junction' } else { 'SymbolicLink' }
    New-Item -ItemType $linkType -Path (Join-Path $dest 'node_modules') -Target (Join-Path $Desktop 'node_modules') | Out-Null
    # src/types.ts pulls the API types from ../shared.
    Copy-Item -Recurse (Join-Path $ScriptDir 'shared') (Join-Path $script:Stage 'shared')
}

function Build-Desktop {
    Write-Host ""
    Write-Host "=== Building the desktop app (SONARE_ENV=$BuildEnv) ==="
    Initialize-Stage
    Set-Location (Join-Path $script:Stage 'desktop')
    # The installed app can't write next to its binary (/opt is root's), so packaged builds
    # keep their storage and logs in the user's data directory.
    # Source maps (most of resources/) would be embedded in the binary for nothing.
    Invoke-Checked node -e "const c = require('./neutralino.config.json'); c.dataLocation = 'system'; c.cli.frontendLibrary.buildCommand = 'npm run build -- --sourcemap false'; require('fs').writeFileSync('neutralino.config.json', JSON.stringify(c, null, 2));"
    # `neu build` runs `npm run build` first (cli.frontendLibrary), which reads SONARE_ENV.
    $env:SONARE_ENV = $BuildEnv
    try { Invoke-Checked npx neu build --release --embed-resources } finally { Remove-Item Env:SONARE_ENV }
}

function Save-WindowsPackage($Ver) {
    $exe = Join-Path $script:Stage 'desktop/dist/sonare-desktop/sonare-desktop-win_x64.exe'
    if (-not (Test-Path $exe)) { Write-Host "Error: $exe was not built"; exit 1 }
    $name = "sonare-$Ver$(Get-Suffix)-windows-x64.exe"
    Copy-Item $exe (Join-Path $Out $name) -Force
    $Built.Add($name)
}

function Get-DesktopEntry($Exec) {
    @(
        '[Desktop Entry]'
        'Type=Application'
        'Name=Sonare'
        'Comment=Music player'
        "Exec=$Exec"
        'Icon=sonare'
        'Categories=AudioVideo;Audio;Player;'
        'Terminal=false'
        'StartupWMClass=sonare-desktop'
    ) -join "`n"
}

# Copies a file and, off Windows, sets its mode (install -m).
function Install-File($Source, $Dest, $Mode) {
    Copy-Item $Source $Dest -Force
    if (-not $OnWindows) { chmod $Mode $Dest }
}

# Writes a .tar.gz whose entries carry the given modes and root ownership, which tar can't
# do from an NTFS folder. $Entries: @{ Name = 'dir/' or 'dir/file'; Source = file or $null; Mode = '755' }
function Set-TarField([byte[]]$Header, [int]$Offset, [int]$Length, [string]$Text) {
    $bytes = [Text.Encoding]::ASCII.GetBytes($Text)
    [Array]::Copy($bytes, 0, $Header, $Offset, [Math]::Min($bytes.Length, $Length))
}

function Write-TarGz($Dest, $Entries) {
    $file = [IO.File]::Create($Dest)
    $gz = New-Object IO.Compression.GZipStream($file, [IO.Compression.CompressionMode]::Compress)
    try {
        $mtime = [Convert]::ToString([DateTimeOffset]::UtcNow.ToUnixTimeSeconds(), 8)
        foreach ($e in $Entries) {
            $data = if ($e.Source) { [IO.File]::ReadAllBytes($e.Source) } else { New-Object byte[] 0 }
            $header = New-Object byte[] 512
            Set-TarField $header 0 100 $e.Name
            Set-TarField $header 100 8 ([Convert]::ToString([Convert]::ToInt32($e.Mode, 8), 8).PadLeft(7, '0'))
            Set-TarField $header 108 8 '0000000'
            Set-TarField $header 116 8 '0000000'
            Set-TarField $header 124 12 ([Convert]::ToString($data.Length, 8).PadLeft(11, '0'))
            Set-TarField $header 136 12 $mtime.PadLeft(11, '0')
            Set-TarField $header 148 8 '        '
            Set-TarField $header 156 1 $(if ($e.Source) { '0' } else { '5' })
            Set-TarField $header 257 6 'ustar'
            Set-TarField $header 263 2 '00'
            Set-TarField $header 265 32 'root'
            Set-TarField $header 297 32 'root'
            $sum = 0
            foreach ($b in $header) { $sum += $b }
            $check = [Text.Encoding]::ASCII.GetBytes([Convert]::ToString($sum, 8).PadLeft(6, '0') + "`0 ")
            [Array]::Copy($check, 0, $header, 148, 8)
            $gz.Write($header, 0, 512)
            if ($data.Length -gt 0) {
                $gz.Write($data, 0, $data.Length)
                $pad = (512 - ($data.Length % 512)) % 512
                if ($pad) { $gz.Write((New-Object byte[] $pad), 0, $pad) }
            }
        }
        $gz.Write((New-Object byte[] 1024), 0, 1024)
    } finally {
        $gz.Dispose()
        $file.Dispose()
    }
}

function Save-LinuxPackages($Ver) {
    $bin = Join-Path $script:Stage 'desktop/dist/sonare-desktop/sonare-desktop-linux_x64'
    $icon = Join-Path $Desktop 'public/icons/appIcon.png'
    if (-not (Test-Path $bin)) { Write-Host "Error: $bin was not built"; exit 1 }
    $work = New-TempDir
    $formatList = $Formats -split ','

    try {
        if ($formatList -contains 'tar.gz') {
            $dir = "sonare-$Ver$(Get-Suffix)-linux-x64"
            $readme = Join-Path $work 'README.txt'
            $entry = Join-Path $work 'sonare.desktop'
            Write-Text $readme "Run ./sonare. Needs GTK 3 and WebKitGTK (libwebkit2gtk-4.1-0 or 4.0-37).`n"
            Write-Text $entry ((Get-DesktopEntry sonare) + "`n")
            Write-TarGz (Join-Path $Out "$dir.tar.gz") @(
                @{ Name = "$dir/"; Source = $null; Mode = '755' }
                @{ Name = "$dir/sonare"; Source = $bin; Mode = '755' }
                @{ Name = "$dir/sonare.png"; Source = $icon; Mode = '644' }
                @{ Name = "$dir/sonare.desktop"; Source = $entry; Mode = '644' }
                @{ Name = "$dir/README.txt"; Source = $readme; Mode = '644' }
            )
            $Built.Add("$dir.tar.gz")
        }

        if ($formatList -contains 'deb') {
            if (-not (Get-Command dpkg-deb -ErrorAction SilentlyContinue)) {
                Write-Host "Note: dpkg-deb is not installed - skipping the .deb."
            } else {
                # Debian versions can't contain '-dev'-style suffixes after a hyphen safely; use '~'.
                $debver = if ($BuildEnv -eq 'dev') { "$Ver~dev" } else { $Ver }
                $root = Join-Path $work 'deb'
                foreach ($d in 'DEBIAN', 'opt/sonare', 'usr/bin', 'usr/share/applications', 'usr/share/icons/hicolor/256x256/apps') {
                    New-Item -ItemType Directory -Force (Join-Path $root $d) | Out-Null
                }
                Install-File $bin (Join-Path $root 'opt/sonare/sonare') 755
                New-Item -ItemType SymbolicLink -Path (Join-Path $root 'usr/bin/sonare') -Target /opt/sonare/sonare | Out-Null
                Install-File $icon (Join-Path $root 'usr/share/icons/hicolor/256x256/apps/sonare.png') 644
                Write-Text (Join-Path $root 'usr/share/applications/sonare.desktop') ((Get-DesktopEntry /opt/sonare/sonare) + "`n")
                $control = @(
                    'Package: sonare'
                    "Version: $debver"
                    'Section: sound'
                    'Priority: optional'
                    'Architecture: amd64'
                    'Depends: libgtk-3-0, libwebkit2gtk-4.1-0 | libwebkit2gtk-4.0-37'
                    'Recommends: gstreamer1.0-plugins-good, gstreamer1.0-plugins-bad, gstreamer1.0-libav'
                    'Maintainer: Sonare <no-reply@sonare.dev>'
                    'Description: Sonare music player'
                    ' Plays music from YouTube through a Sonare server, and files on this computer.'
                ) -join "`n"
                Write-Text (Join-Path $root 'DEBIAN/control') "$control`n"
                # buildFE.sh sets umask 022 for this; PowerShell can't, so fix the modes after.
                chmod -R 'u+rwX,go+rX,go-w' $root
                $name = "sonare_${debver}_amd64.deb"
                dpkg-deb --build --root-owner-group $root (Join-Path $Out $name) | Out-Null
                if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
                $Built.Add($name)
            }
        }

        if ($formatList -contains 'appimage') {
            if (-not (Get-Command appimagetool -ErrorAction SilentlyContinue)) {
                Write-Host "Note: appimagetool is not installed - skipping the AppImage."
                Write-Host "      Get it from https://github.com/AppImage/appimagetool/releases and put it on PATH."
            } else {
                $app = Join-Path $work 'Sonare.AppDir'
                New-Item -ItemType Directory -Force (Join-Path $app 'usr/bin') | Out-Null
                Install-File $bin (Join-Path $app 'usr/bin/sonare') 755
                Install-File $icon (Join-Path $app 'sonare.png') 644
                Write-Text (Join-Path $app 'sonare.desktop') ((Get-DesktopEntry sonare) + "`n")
                $appRun = Join-Path $app 'AppRun'
                Write-Text $appRun ('#!/bin/sh' + "`n" + 'exec "$(dirname "$(readlink -f "$0")")/usr/bin/sonare" "$@"' + "`n")
                chmod 755 $appRun
                chmod -R 'u+rwX,go+rX,go-w' $app
                $name = "sonare-$Ver$(Get-Suffix)-linux-x64.AppImage"
                $env:ARCH = 'x86_64'
                try { appimagetool --no-appstream $app (Join-Path $Out $name) | Out-Null } finally { Remove-Item Env:ARCH }
                if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
                $Built.Add($name)
            }
        }
    } finally {
        Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
    }
}

function Build-Web($Ver) {
    Write-Host ""
    Write-Host "=== Building the web app (SONARE_ENV=$BuildEnv) ==="
    Initialize-Stage
    Set-Location (Join-Path $script:Stage 'desktop')
    $env:SONARE_ENV = $BuildEnv
    try { Invoke-Checked npm run build } finally { Remove-Item Env:SONARE_ENV }
    $name = "sonare-$Ver$(Get-Suffix)-web.tar.gz"
    # Windows' own bsdtar: a Git-for-Windows GNU tar earlier on PATH reads C: as a host name.
    $tar = if ($OnWindows) { Join-Path $env:SystemRoot 'System32/tar.exe' } else { 'tar' }
    # Source maps stay out of what goes on the server.
    Invoke-Checked $tar -C (Join-Path $script:Stage 'desktop/resources') '--exclude=*.map' -czf (Join-Path $Out $name) .
    $Built.Add($name)
}

# ---- android ---------------------------------------------------------------------------

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
    if (-not $env:ANDROID_HOME) { Write-Host "Error: Android SDK not found - set ANDROID_HOME."; exit 1 }
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}

# Gradle needs a full JDK (javac); a JRE alone fails with "JAVA_COMPILER".
function Import-Jdk {
    $javac = if ($OnWindows) { 'bin/javac.exe' } else { 'bin/javac' }
    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME $javac))) { return }
    if (Get-Command javac -ErrorAction SilentlyContinue) { return }
    foreach ($jdk in (Get-ChildItem (Join-Path $HOME '.jdks') -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue)) {
        if (Test-Path (Join-Path $jdk.FullName $javac)) { $env:JAVA_HOME = $jdk.FullName; return }
    }
    Write-Host "Error: no JDK found (javac). Install JDK 17 or set JAVA_HOME."
    exit 1
}

# android/app/build.gradle refuses a release build without the upload key.
function Assert-Signing {
    $props = Join-Path $HOME '.gradle/gradle.properties'
    $lines = if (Test-Path $props) { Get-Content $props } else { @() }
    $missing = @('SONARE_UPLOAD_STORE_FILE', 'SONARE_UPLOAD_STORE_PASSWORD', 'SONARE_UPLOAD_KEY_ALIAS', 'SONARE_UPLOAD_KEY_PASSWORD') |
        Where-Object { $key = $_; -not ($lines | Where-Object { $_.StartsWith("$key=") }) }
    if (-not $missing) { return }
    Write-Host "Error: the release signing key isn't set up. Missing in ${props}:"
    $missing | ForEach-Object { Write-Host "  $_" }
    $keystore = Join-Path $HOME '.gradle/sonare-upload.keystore'
    Write-Host ""
    Write-Host "One-time setup (keep the keystore and passwords safe - every update must use the same key):"
    Write-Host "  keytool -genkeypair -v -storetype PKCS12 -keystore `"$keystore`" ``"
    Write-Host "          -alias sonare -keyalg RSA -keysize 2048 -validity 10000"
    Write-Host "  then add to ${props}:"
    Write-Host "    SONARE_UPLOAD_STORE_FILE=$($keystore -replace '\\', '/')"
    Write-Host "    SONARE_UPLOAD_STORE_PASSWORD=..."
    Write-Host "    SONARE_UPLOAD_KEY_ALIAS=sonare"
    Write-Host "    SONARE_UPLOAD_KEY_PASSWORD=..."
    exit 1
}

# The emulator APK, built for testing on a PC and never uploaded.
$script:EmulatorApk = ''

function Build-Android {
    Write-Host ""
    Write-Host "=== Building the Android release APKs ==="
    $flags = @()
    if ($BuildEnv -eq 'dev') {
        Write-Host "Note: the dev APK still starts on the production API (mobile/src/data/config.ts), but"
        Write-Host "      allows plain http: point it at this computer in Settings -> Server address."
        $flags += '-PsonareDev'
    }
    Assert-Signing
    Import-AndroidSdk
    Import-Jdk
    Set-Location (Join-Path $Mobile 'android')
    if ($OnWindows) { Invoke-Checked ./gradlew.bat assembleRelease @flags } else { Invoke-Checked ./gradlew assembleRelease @flags }
    # One APK per CPU (splits in app/build.gradle): arm64-v8a for phones, x86_64 for the emulator.
    $apks = 'app/build/outputs/apk/release'
    $version = "$(Get-AndroidVersion)$(Get-Suffix)"
    $name = "sonare-$version-android-arm64.apk"
    Copy-Item (Join-Path $apks 'app-arm64-v8a-release.apk') (Join-Path $Out $name) -Force
    $Built.Add($name)
    $script:EmulatorApk = "sonare-$version-android-x86_64-emulator.apk"
    Copy-Item (Join-Path $apks 'app-x86_64-release.apk') (Join-Path $Out $script:EmulatorApk) -Force
    $Built.Add($script:EmulatorApk)
}

function Format-Size($Bytes) {
    if ($Bytes -ge 1GB) { '{0:0.0}G' -f ($Bytes / 1GB) }
    elseif ($Bytes -ge 1MB) { '{0:0.0}M' -f ($Bytes / 1MB) }
    else { '{0:0}K' -f [Math]::Ceiling($Bytes / 1KB) }
}

# ---- run -------------------------------------------------------------------------------

$succeeded = $false
Push-Location
try {
    Assert-Node
    Write-Host ""
    Set-Versions

    if ((Test-Target linux) -or (Test-Target windows)) {
        $ver = Get-DesktopVersion
        # One `neu build` makes the binaries for every platform.
        Build-Desktop
        if (Test-Target linux) { Save-LinuxPackages $ver }
        if (Test-Target windows) { Save-WindowsPackage $ver }
    }
    if (Test-Target web) { Build-Web (Get-DesktopVersion) }
    if (Test-Target android) { Build-Android }
    $succeeded = $true
} catch {
    # A missing command throws here instead of setting $LASTEXITCODE.
    Write-Host ($_ | Out-String)
    exit 1
} finally {
    Pop-Location
    Remove-Stage
    if (-not $succeeded -and $Changed.Count -gt 0) {
        Restore-VersionFiles
        Write-Host ""
        Write-Host "The build failed - the version files are back as they were."
    }
    if ($script:Backup) { Remove-Item -Recurse -Force $script:Backup -ErrorAction SilentlyContinue }
}

Write-Host ""
Write-Host "=== Built (in $Out) ==="
foreach ($f in $Built) {
    Write-Host ('  {0,-48} {1}' -f $f, (Format-Size (Get-Item (Join-Path $Out $f)).Length))
}
if ($Changed.Count -gt 0) {
    Write-Host ""
    Write-Host "Version changed in (commit these):"
    foreach ($f in $Changed) { Write-Host "  $($f.Substring($ScriptDir.Length + 1) -replace '\\', '/')" }
}
Write-Host ""
if ($BuildEnv -eq 'dev') {
    Write-Host "These are dev builds (desktop/web use VITE_API_BASE, Android allows http). Build with prod before"
    Write-Host "uploading them on the admin page's Releases tab."
} else {
    Write-Host "Upload them on the admin page: /admin/releases."
}
if ($script:EmulatorApk) {
    Write-Host "$($script:EmulatorApk) is for the emulator on this PC (adb install) - don't upload it."
}
exit 0
