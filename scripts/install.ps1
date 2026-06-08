# SakeAnime Installer Script
# Ejecuta: irm https://raw.githubusercontent.com/Juan18TM/SakeAnime/main/scripts/install.ps1 | iex

$repo = "Juan18TM/SakeAnime"
$releaseUrl = "https://api.github.com/repos/$repo/releases/latest"
$downloadDir = "$env:TEMP\SakeAnime"

Write-Host "Buscando ultima version de SakeAnime..." -ForegroundColor Cyan

try {
    $release = Invoke-RestMethod -Uri $releaseUrl -Headers @{ "User-Agent" = "SakeAnime-Installer" }
} catch {
    Write-Host "Error al obtener la informacion de la release." -ForegroundColor Red
    exit 1
}

$asset = $release.assets | Where-Object { $_.name -match "\.exe$" } | Select-Object -First 1

if (-not $asset) {
    Write-Host "No se encontro un archivo .exe en la release." -ForegroundColor Red
    exit 1
}

Write-Host "Version: $($release.tag_name)" -ForegroundColor Green
Write-Host "Descargando: $($asset.name)..." -ForegroundColor Cyan

if (-not (Test-Path $downloadDir)) {
    New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
}

$installerPath = Join-Path $downloadDir $asset.name

try {
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installerPath -Headers @{ "User-Agent" = "SakeAnime-Installer" }
} catch {
    Write-Host "Error al descargar el instalador." -ForegroundColor Red
    exit 1
}

Write-Host "Descarga completada." -ForegroundColor Green
Write-Host "Iniciando instalacion..." -ForegroundColor Cyan

Start-Process -FilePath $installerPath

Write-Host "El instalador se ha abierto. Sigue las instrucciones en pantalla." -ForegroundColor Green
