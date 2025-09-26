param(
    [int]$Port = 5432,
    [int]$TimeoutSeconds = 10
)

$pgRoot = Join-Path $env:USERPROFILE 'scoop'
$dataDir = Join-Path $pgRoot 'persist\postgresql\data'
$logFile = Join-Path $pgRoot 'persist\postgresql\postgres.log'

if (-not (Test-Path $dataDir)) {
    Write-Error "PostgreSQL data directory not found at '$dataDir'. Install or init the database first.";
    exit 1
}

# Ensure Scoop shims are on PATH so pg_ctl / pg_isready can be found
if (-not $env:Path.Split([IO.Path]::PathSeparator) -contains (Join-Path $pgRoot 'shims')) {
    $env:Path = (Join-Path $pgRoot 'shims') + [IO.Path]::PathSeparator + $env:Path
}

function Test-PostgresReady {
    param(
        [int]$Port
    )
    $result = pg_isready -h localhost -p $Port 2>$null
    return ($LASTEXITCODE -eq 0)
}

if (Test-PostgresReady -Port $Port) {
    Write-Host "PostgreSQL is already running on port $Port." -ForegroundColor Green
    exit 0
}

Write-Host "Starting PostgreSQL (port $Port)..." -ForegroundColor Yellow
pg_ctl -D $dataDir -l $logFile start -o "-p $Port -h localhost" | Out-Null

$stopWatch = [System.Diagnostics.Stopwatch]::StartNew()
$ready = $false
while ($stopWatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    Start-Sleep -Seconds 1
    if (Test-PostgresReady -Port $Port) {
        $ready = $true
        break
    }
}

if ($ready) {
    Write-Host "PostgreSQL is accepting connections on port $Port." -ForegroundColor Green
    exit 0
} else {
    Write-Warning "PostgreSQL did not respond within $TimeoutSeconds seconds. Check '$logFile' for details."
    exit 2
}
