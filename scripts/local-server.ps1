param([Parameter(Mandatory = $true)][ValidateSet('start', 'stop')][string]$Action)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot '.local-server'
$stateFile = Join-Path $runtimeDir 'server.json'
$url = 'http://localhost:5173/'

function Get-ProjectServer {
    if (-not (Test-Path -LiteralPath $stateFile)) { return $null }
    try {
        $saved = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
        $candidate = Get-Process -Id $saved.pid -ErrorAction Stop
        # PID plus creation time prevents stopping an unrelated reused PID.
        if ($candidate.ProcessName -eq 'node' -and
            $candidate.StartTime.ToUniversalTime().Ticks.ToString() -eq $saved.started) {
            return $candidate
        }
    } catch { return $null }
    return $null
}

try {
    $server = Get-ProjectServer
    if ($null -ne $server) {
        Stop-Process -InputObject $server
        if (-not $server.WaitForExit(5000)) {
            throw 'O servidor anterior nao encerrou. O build foi cancelado.'
        }
        Write-Host 'Air Theremin parado.'
    } else {
        Write-Host 'Air Theremin ja esta parado.'
    }
    if (Test-Path -LiteralPath $stateFile) { Remove-Item -LiteralPath $stateFile }
    if ($Action -eq 'stop') { exit 0 }

    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    $vite = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
    if (-not (Test-Path -LiteralPath $vite)) {
        throw 'Dependencias ausentes. Execute npm.cmd install na pasta do projeto.'
    }
    New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
    $stdout = Join-Path $runtimeDir 'stdout.log'
    $stderr = Join-Path $runtimeDir 'stderr.log'
    # This variable belongs only to this launcher and its child process.
    $env:VITE_BASE_PATH = '/'
    Write-Host 'Gerando build de producao...'
    Push-Location -LiteralPath $projectRoot
    try {
        & $npm run build
        if ($LASTEXITCODE -ne 0) {
            throw 'Build falhou. O servidor nao foi iniciado; corrija o erro e execute start.cmd novamente.'
        }
    } finally {
        Pop-Location
    }
    $server = Start-Process -FilePath $node -ArgumentList @("`"$vite`"", 'preview', '--host', 'localhost', '--port', '5173', '--strictPort') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    @{ pid = $server.Id; started = $server.StartTime.ToUniversalTime().Ticks.ToString() } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8

    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 500
        $server.Refresh()
        if ($server.HasExited) {
            $details = Get-Content -LiteralPath $stderr -Raw -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath $stateFile -ErrorAction SilentlyContinue
            throw "O servidor nao iniciou. A porta 5173 pode estar ocupada. $details"
        }
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1
            if ($response.StatusCode -eq 200 -and $response.Content.Contains('Air Theremin')) {
                Write-Host "Air Theremin iniciado: $url"
                Write-Host 'Use stop.cmd para parar. Logs em .local-server.'
                exit 0
            }
        } catch { }
    }
    Stop-Process -InputObject $server -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stateFile -ErrorAction SilentlyContinue
    throw 'O servidor nao respondeu a tempo. Confira .local-server\stderr.log.'
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
