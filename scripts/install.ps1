#Requires -Version 5.1
<#
  Instala SakeAnime en Windows desde la última release de GitHub.

  Uso (PowerShell):
    irm https://raw.githubusercontent.com/Juan18TM/SakeAnime/main/scripts/install.ps1 | iex

  O descargando el script:
    .\install.ps1 -RepoOwner Juan18TM -RepoName SakeAnime
#>
param(
  [string]$RepoOwner = "Juan18TM",
  [string]$RepoName = "SakeAnime",
  [string]$AppName = "SakeAnime"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host $Message -ForegroundColor Cyan
}

Write-Step "Buscando la última versión de $AppName..."

$headers = @{ "User-Agent" = "$AppName-Installer" }
$release = Invoke-RestMethod `
  -Uri "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest" `
  -Headers $headers

$asset = $release.assets | Where-Object { $_.name -match "Setup.*\.exe$" } | Select-Object -First 1
if (-not $asset) {
  throw "No se encontró el instalador (.exe) en la release $($release.tag_name)."
}

$installerPath = Join-Path $env:TEMP "$AppName-Setup.exe"

Write-Step "Descargando $($asset.name)..."
Invoke-WebRequest `
  -Uri $asset.browser_download_url `
  -OutFile $installerPath `
  -Headers $headers

Write-Step "Ejecutando instalador..."
Start-Process -FilePath $installerPath -Wait

Write-Host ""
Write-Host "Listo. Abre $AppName desde el menú Inicio o el escritorio." -ForegroundColor Green
