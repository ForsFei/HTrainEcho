param(
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$serviceUrl = 'http://127.0.0.1:43160/'
$servicePort = 43160

Set-Location -LiteralPath $projectRoot

function Test-HTrainEocoService {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $serviceUrl -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content -match 'HTrainEoco|听见火车'
    }
    catch {
        return $false
    }
}

function Test-LocalPortInUse {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $connect = $client.ConnectAsync('127.0.0.1', $servicePort)
        return $connect.Wait(800) -and $client.Connected
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

Write-Host ''
Write-Host 'HTrainEoco / 听见火车' -ForegroundColor Cyan
Write-Host "项目目录：$projectRoot"
Write-Host "访问地址：$serviceUrl"
Write-Host ''

if (Test-HTrainEocoService) {
    Write-Host '服务已经在运行，正在打开页面……' -ForegroundColor Green
    if (-not $NoBrowser) {
        Start-Process $serviceUrl
    }
    exit 0
}

if (Test-LocalPortInUse) {
    Write-Host "端口 $servicePort 已被其他程序占用，请先关闭占用程序。" -ForegroundColor Red
    exit 2
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $nodeCommand -or -not $npmCommand) {
    Write-Host '没有找到 Node.js 或 npm。请先安装 Node.js 24 或更高版本。' -ForegroundColor Red
    exit 3
}

$nodeVersion = (& $nodeCommand.Source --version).Trim()
$nodeMajor = [int](($nodeVersion -replace '^v', '').Split('.')[0])
if ($nodeMajor -lt 24) {
    Write-Host "当前 Node.js 版本为 $nodeVersion，需要 24 或更高版本。" -ForegroundColor Red
    exit 4
}
Write-Host "Node.js：$nodeVersion" -ForegroundColor DarkGray

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
    Write-Host '首次启动，正在安装依赖……' -ForegroundColor Yellow
    & $npmCommand.Source install
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

$localEnv = Join-Path $projectRoot '.env.local'
$exampleEnv = Join-Path $projectRoot '.env.example'
if (-not (Test-Path -LiteralPath $localEnv)) {
    Copy-Item -LiteralPath $exampleEnv -Destination $localEnv
    Write-Host '已根据 .env.example 创建 .env.local。' -ForegroundColor Yellow
}

Write-Host '正在检查本地数据库……'
& $npmCommand.Source run db:migrate
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

$browserJob = $null
if (-not $NoBrowser) {
    $browserJob = Start-Job -ScriptBlock {
        param($url)
        for ($attempt = 0; $attempt -lt 80; $attempt++) {
            try {
                $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
                if ($response.StatusCode -eq 200) {
                    Start-Process $url
                    return
                }
            }
            catch {
                Start-Sleep -Milliseconds 250
            }
        }
    } -ArgumentList $serviceUrl
}

Write-Host ''
Write-Host '正在启动服务。关闭此窗口或按 Ctrl+C 可停止服务。' -ForegroundColor Green
Write-Host ''

try {
    & $npmCommand.Source run dev
    exit $LASTEXITCODE
}
finally {
    if ($browserJob) {
        Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue
    }
}
