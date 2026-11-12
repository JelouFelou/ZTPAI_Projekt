param([switch]$Stop)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$stateDirectory = Join-Path $root '.boardrent-dev'
$stateFile = Join-Path $stateDirectory 'processes.json'

function Test-OwnedProcess($entry) {
    try {
        $process = Get-Process -Id $entry.pid -ErrorAction Stop
        return $process.StartTime.ToUniversalTime().Ticks -eq $entry.startedAt
    } catch { return $false }
}

if ($Stop) {
    if (!(Test-Path -LiteralPath $stateFile)) {
        Write-Host 'Nie ma uruchomionych serwerów BoardRent zapisanych przez ten skrypt.'
        exit 0
    }
    $entries = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    $failed = $false
    foreach ($entry in $entries) {
        if (Test-OwnedProcess $entry) {
            & taskkill.exe /PID $entry.pid /T /F | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Zatrzymano $($entry.name) (PID $($entry.pid))."
            } else {
                Write-Warning "Nie można zatrzymać $($entry.name) (PID $($entry.pid))."
                $failed = $true
            }
        } else {
            Write-Host "Pominięto $($entry.name): proces już nie działa lub PID został użyty ponownie."
        }
    }
    if ($failed) { throw 'Nie zatrzymano wszystkich serwerów. Sprawdź uprawnienia i spróbuj ponownie.' }
    Remove-Item -LiteralPath $stateFile
    exit 0
}

if (!(Test-Path -LiteralPath (Join-Path $root 'backend\.env'))) {
    throw 'Brak backend/.env. Skonfiguruj backend zgodnie z README.md.'
}
foreach ($part in @('backend', 'frontend')) {
    if (!(Test-Path -LiteralPath (Join-Path $root "$part\node_modules"))) {
        throw "Brak zależności w $part. Uruchom npm.cmd ci w tym katalogu."
    }
}
if (Test-Path -LiteralPath $stateFile) {
    $existing = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    if (@($existing | Where-Object { Test-OwnedProcess $_ }).Count -gt 0) {
        throw 'Serwery uruchomione przez dev.ps1 już działają. Użyj .\dev.ps1 -Stop.'
    }
    Remove-Item -LiteralPath $stateFile
}
$occupied = @(Get-NetTCPConnection -LocalPort 3000, 5173 -State Listen -ErrorAction SilentlyContinue)
if ($occupied.Count -gt 0) {
    throw "Port 3000 lub 5173 jest zajęty. Zatrzymaj obecny serwer przed uruchomieniem dev.ps1."
}

New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
$inputFile = Join-Path $stateDirectory 'stdin.txt'
Set-Content -LiteralPath $inputFile -Value '' -NoNewline
$entries = @()
try {
    foreach ($service in @(@{ name = 'backend'; command = 'npm.cmd run start:dev' }, @{ name = 'frontend'; command = 'npm.cmd run dev -- --host 127.0.0.1 --strictPort' })) {
        $process = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/s', '/c', $service.command -WorkingDirectory (Join-Path $root $service.name) -WindowStyle Hidden -RedirectStandardInput $inputFile -RedirectStandardOutput (Join-Path $stateDirectory "$($service.name).log") -RedirectStandardError (Join-Path $stateDirectory "$($service.name).error.log") -PassThru
        $entries += @{ name = $service.name; pid = $process.Id; startedAt = $process.StartTime.ToUniversalTime().Ticks }
    }
    $entries | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
} catch {
    foreach ($entry in $entries) { if (Test-OwnedProcess $entry) { & taskkill.exe /PID $entry.pid /T /F | Out-Null } }
    throw
}
Write-Host 'Uruchomiono BoardRent. Frontend: http://127.0.0.1:5173  API: http://127.0.0.1:3000/api'
Write-Host 'Zatrzymanie: .\dev.cmd stop'
Write-Host 'Logi: .boardrent-dev\backend.log oraz .boardrent-dev\frontend.log'
