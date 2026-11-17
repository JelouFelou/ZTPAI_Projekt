param([switch]$Stop, [switch]$Status, [switch]$Logs)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$stateDirectory = Join-Path $root '.boardrent-dev'
$stateFile = Join-Path $stateDirectory 'processes.json'
$envFile = Join-Path $root 'backend\.env'
$script:entries = @()

function Test-OwnedProcess($entry) {
    $process = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
    if (!$process) { return $false }
    try { return $process.StartTime.ToUniversalTime().Ticks -eq $entry.startedAt }
    catch { throw "Nie mozna sprawdzic procesu $($entry.pid). Uzyj terminala tego samego uzytkownika; zapis procesow zostal zachowany." }
}
function Stop-Servers {
    foreach ($entry in $script:entries) {
        if (Test-OwnedProcess $entry) {
            Write-Host "Zatrzymywanie $($entry.name) (PID $($entry.pid))..."
            & taskkill.exe /PID $entry.pid /T /F | Out-Null
            if ($LASTEXITCODE -ne 0 -and (Test-OwnedProcess $entry)) { throw "Nie mozna zatrzymac $($entry.name). Uzyj terminala tego samego uzytkownika, ktory uruchomil serwer." }
        }
    }
    $script:entries = @()
    if (Test-Path -LiteralPath $stateFile) { Remove-Item -LiteralPath $stateFile }
}
function Test-Http([string]$url) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -ne 200) { return $false }
        if ($url.Contains('/api/games')) {
            $body = $response.Content | ConvertFrom-Json
            return $null -ne $body.data -and $null -ne $body.pagination
        }
        return $true
    }
    catch { return $false }
}
function Show-Logs {
    foreach ($name in @('backend', 'frontend')) {
        foreach ($suffix in @('log', 'error.log')) {
            $path = Join-Path $stateDirectory "$name.$suffix"
            if (Test-Path -LiteralPath $path) { Write-Host "--- $name.$suffix (ostatnie 20 linii) ---"; Get-Content -LiteralPath $path -Tail 20 }
        }
    }
}
function Wait-Ready([string]$label, [scriptblock]$check, [int]$seconds) {
    $timer = [Diagnostics.Stopwatch]::StartNew()
    $lastProgress = -15
    while ($timer.Elapsed.TotalSeconds -lt $seconds) {
        if (& $check) { Write-Host "[OK] $label"; return }
        if ($timer.Elapsed.TotalSeconds - $lastProgress -ge 15) {
            Write-Host "Czekam: $label ($([int]$timer.Elapsed.TotalSeconds)/$seconds s)..."
            $lastProgress = $timer.Elapsed.TotalSeconds
        }
        Start-Sleep -Seconds 1
    }
    throw "Przekroczono czas oczekiwania: $label."
}
function Invoke-Npm([string]$part, [string[]]$npmArguments) {
    Push-Location (Join-Path $root $part)
    try {
        & npm.cmd @npmArguments
        if ($LASTEXITCODE -ne 0) { throw "Blad: $part / npm $($npmArguments -join ' '). Sprawdz komunikat powyzej." }
    } finally { Pop-Location }
}
function Get-Setting([string]$name) {
    $lines = @(Get-Content -LiteralPath $envFile | Where-Object { $_ -match "^\s*(?:export\s+)?$name\s*=" })
    if ($lines.Count -eq 0) { return '' }
    $value = ($lines[-1] -replace "^\s*(?:export\s+)?$name\s*=\s*", '').Trim()
    if ($value.StartsWith('"') -or $value.StartsWith("'")) {
        $end = $value.IndexOf($value.Substring(0, 1), 1)
        if ($end -lt 0) { throw "Nieprawidlowa wartosc $name w backend/.env." }
        return $value.Substring(1, $end - 1)
    }
    return ($value -replace '\s+#.*$', '').Trim()
}
function Test-Tcp([string]$address, [int]$port) {
    $client = New-Object Net.Sockets.TcpClient
    try {
        $pending = $client.BeginConnect($address, $port, $null, $null)
        if (!$pending.AsyncWaitHandle.WaitOne(1500)) { return $false }
        $client.EndConnect($pending)
        return $true
    } catch { return $false }
    finally { $client.Dispose() }
}
function Test-Docker {
    # Windows PowerShell treats redirected native stderr as an error record.
    $ErrorActionPreference = 'Continue'
    & docker info --format '{{.ServerVersion}}' *> $null
    return $LASTEXITCODE -eq 0
}
function Ensure-Database {
    try { $database = [Uri](Get-Setting 'DATABASE_URL') } catch { throw 'Nieprawidlowy DATABASE_URL w backend/.env.' }
    if (!$database.IsAbsoluteUri -or $database.Scheme -notin @('postgres', 'postgresql')) { throw 'Ustaw poprawny DATABASE_URL (postgresql://...) w backend/.env.' }
    $dbPort = if ($database.Port -gt 0) { $database.Port } else { 5432 }
    if (Test-Tcp $database.Host $dbPort) { Write-Host '[OK] Port bazy odpowiada; migracje sprawdza dane logowania.'; return }
    if ($database.Host -notin @('localhost', '127.0.0.1', '[::1]', '::1')) { throw 'Zdalna baza nie odpowiada. Sprawdz jej serwer lub VPN.' }
    $configuredPort = Get-Setting 'POSTGRES_PORT'
    if (!$configuredPort) { $configuredPort = '5432' }
    if ($dbPort -ne [int]$configuredPort) { throw 'Port DATABASE_URL nie zgadza sie z POSTGRES_PORT dla Compose. Popraw backend/.env.' }
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Brak Docker Desktop. Zainstaluj go lub uruchom PostgreSQL wskazany w backend/.env.' }
    if (!(Test-Docker)) {
        Write-Host 'Docker nie odpowiada. Uruchamiam Docker Desktop...'
        $candidates = @((Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'), (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'))
        $desktop = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        if (!$desktop) { throw 'Nie znaleziono Docker Desktop. Uruchom go recznie i ponow dev.cmd.' }
        Start-Process -FilePath $desktop -WindowStyle Hidden
        Wait-Ready 'silnik Docker (jesli nie rusza, sprawdz Docker Desktop / WSL)' { Test-Docker } 120
    }
    Write-Host 'Uruchamiam PostgreSQL projektu (bez usuwania danych)...'
    & docker compose --project-directory $root --env-file $envFile up -d --wait --wait-timeout 60 db
    if ($LASTEXITCODE -ne 0) { throw 'Nie udalo sie uruchomic bazy. Sprawdz Docker Desktop i docker compose logs --tail 30 db.' }
    Wait-Ready 'port PostgreSQL' { Test-Tcp $database.Host $dbPort } 20
}
function Start-Server([string]$name, [string]$command) {
    $inputFile = Join-Path $stateDirectory "$name.stdin.txt"
    Set-Content -LiteralPath $inputFile -Value '' -NoNewline
    $process = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/s', '/c', $command -WorkingDirectory (Join-Path $root $name) -WindowStyle Hidden -RedirectStandardInput $inputFile -RedirectStandardOutput (Join-Path $stateDirectory "$name.log") -RedirectStandardError (Join-Path $stateDirectory "$name.error.log") -PassThru
    $script:entries += @{ name = $name; pid = $process.Id; startedAt = $process.StartTime.ToUniversalTime().Ticks }
    ConvertTo-Json -InputObject @($script:entries) | Set-Content -LiteralPath $stateFile -Encoding UTF8
}

# Only one launcher may change the process state at a time.
New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
$lock = $null
try {
    try { $lock = [IO.File]::Open((Join-Path $stateDirectory 'launcher.lock'), 'OpenOrCreate', 'ReadWrite', 'None') }
    catch { throw 'Inny dev.cmd wlasnie pracuje. Poczekaj na jego zakonczenie.' }
    if (Test-Path -LiteralPath $stateFile) {
        try { $script:entries = @(Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json | ForEach-Object { $_ }) }
        catch { throw 'Uszkodzony processes.json. Sprawdz procesy przed usunieciem tego pliku.' }
    }
    if ($Logs) { Show-Logs; exit 0 }
    if ($Status) {
        $healthy = $true
        foreach ($probe in @(
            @{ name = 'Backend i baza'; url = 'http://127.0.0.1:3000/api/games?limit=1' },
            @{ name = 'Frontend'; url = 'http://127.0.0.1:5173/' },
            @{ name = 'Frontend -> API -> baza'; url = 'http://127.0.0.1:5173/api/games?limit=1' }
        )) {
            if (Test-Http $probe.url) { Write-Host "[OK] $($probe.name)" }
            else { Write-Host "[BLAD] $($probe.name)"; $healthy = $false }
        }
        if (!$healthy) { Write-Host 'Uruchom dev.cmd, aby naprawic start, lub dev.cmd logs, aby zobaczyc logi.'; exit 1 }
        exit 0
    }
    if ($Stop) { Stop-Servers; Write-Host 'Serwery zatrzymane. Baza i jej dane pozostaja dostepne.'; exit 0 }
    foreach ($tool in @('node', 'npm.cmd')) {
        if (!(Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Brak $tool. Zainstaluj Node.js i otworz nowy terminal." }
    }
    if (!(Test-Path -LiteralPath $envFile)) {
        Copy-Item -LiteralPath (Join-Path $root 'backend\.env.example') -Destination $envFile
        Write-Host 'Utworzono backend/.env z konfiguracja lokalna.'
    }
    foreach ($key in @('DATABASE_URL', 'AUTH_JWT_SECRET', 'POSTGRES_PORT', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB')) {
        if ([Environment]::GetEnvironmentVariable($key)) { throw "Zmienna $key w terminalu moze nadpisac backend/.env. Usun ja z biezacego terminala i ponow dev.cmd." }
    }
    $secret = Get-Setting 'AUTH_JWT_SECRET'
    if (!$secret) {
        $bytes = New-Object byte[] 48
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        $secret = [Convert]::ToBase64String($bytes)
        $content = [IO.File]::ReadAllText($envFile)
        $content = [regex]::Replace($content, '(?m)^\s*(?:export\s+)?AUTH_JWT_SECRET\s*=.*\r?$', '')
        [IO.File]::WriteAllText($envFile, $content.TrimEnd() + "`r`nAUTH_JWT_SECRET=$secret`r`n", (New-Object Text.UTF8Encoding $false))
        Write-Host 'Zapisano losowy sekret JWT w backend/.env.'
    }
    if ([Text.Encoding]::UTF8.GetByteCount($secret) -lt 32) { throw 'AUTH_JWT_SECRET jest za krotki. Ustaw co najmniej 32 bajty w backend/.env.' }
    $apiPort = Get-Setting 'PORT'
    if (($apiPort -and $apiPort -ne '3000') -or ($env:PORT -and $env:PORT -ne '3000')) { throw 'Lokalne proxy wymaga PORT=3000. Popraw backend/.env lub zmienna PORT w terminalu.' }
    Ensure-Database
    Write-Host 'Odswiezam serwery zarzadzane przez dev.cmd...'
    Stop-Servers
    foreach ($port in @(3000, 5173)) {
        $listeners = @([Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | Where-Object Port -eq $port)
        if ($listeners.Count -gt 0) {
            & netstat.exe -ano -p tcp | Select-String ":$port\s.*LISTENING"
            throw "Port $port zajmuje inny proces (PID powyzej). Zatrzymaj go lub kontener Compose; dev.cmd nie zamyka obcych procesow."
        }
    }
    foreach ($part in @('backend', 'frontend')) {
        $installedLock = Join-Path $root "$part\node_modules\.package-lock.json"
        $packageLock = Join-Path $root "$part\package-lock.json"
        if (!(Test-Path -LiteralPath $installedLock) -or (Get-Item -LiteralPath $packageLock).LastWriteTimeUtc -gt (Get-Item -LiteralPath $installedLock).LastWriteTimeUtc) {
            Write-Host "Instaluje zaleznosci: $part..."
            Invoke-Npm $part @('ci')
        }
    }
    Write-Host 'Przygotowuje klienta Prisma i stosuje migracje...'
    Invoke-Npm 'backend' @('run', 'db:generate')
    Invoke-Npm 'backend' @('run', 'db:deploy')
    Start-Server 'backend' 'npm.cmd run start:dev'
    Wait-Ready 'backend i polaczenie z baza' { Test-Http 'http://127.0.0.1:3000/api/games?limit=1' } 90
    Start-Server 'frontend' 'npm.cmd run dev -- --host 127.0.0.1 --strictPort'
    Wait-Ready 'frontend' { Test-Http 'http://127.0.0.1:5173/' } 45
    Wait-Ready 'frontend -> API -> baza' { Test-Http 'http://127.0.0.1:5173/api/games?limit=1' } 20
    Write-Host "`nBoardRent gotowy: http://127.0.0.1:5173"
    Write-Host 'dev.cmd status | dev.cmd logs | dev.cmd restart | dev.cmd stop'
} catch {
    Write-Host "`n[BLAD] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Logi: .boardrent-dev (dev.cmd logs). Po usunieciu przyczyny uruchom dev.cmd ponownie.'
    Show-Logs
    exit 1
} finally { if ($lock) { $lock.Dispose() } }
