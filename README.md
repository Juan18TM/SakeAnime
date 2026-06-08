# SakeAnime

Aplicación de escritorio para ver anime, construida con Electron, React y TypeScript.

## Features

- Múltiples proveedores de anime (TioAnime, AnimeFenix2, JiruHub)
- Reproductor de video integrado con soporte HLS
- Catálogo, detalle de anime y lista de episodios
- Historial de visualización
- Favoritos
- Interfaz oscura tipo Crunchyroll

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Desktop**: Electron
- **Build**: Vite + Turborepo
- **Video**: hls.js

## Install

```bash
npm install
```

## Development

```bash
# App de escritorio (Electron + Vite)
npm run dev --workspace=apps/desktop

# Solo Vite (sin Electron)
npm run dev --workspace=apps/desktop
```

## Build

```bash
npm run build --workspace=apps/desktop
```

## Distribuir (instalador Windows)

### 1. Generar el `.exe` instalador

Desde la raíz del proyecto:

```bash
npm install
npm run pack:win
```

El instalador queda en:

```
apps/desktop/release/SakeAnime Setup 1.0.0.exe
```

### 2. Subir a GitHub Releases

1. Crea un repo en GitHub (si aún no lo tienes).
2. Sube el código: `git push origin main`
3. En GitHub → **Releases** → **Create a new release**
4. Tag: `v1.0.0`
5. Adjunta el archivo `SakeAnime Setup 1.0.0.exe`
6. Publica la release

### 3. Comando para que la gente instale (PowerShell)

Tus usuarios ejecutan en **PowerShell**:

```powershell
irm https://raw.githubusercontent.com/Juan18TM/SakeAnime/main/scripts/install.ps1 | iex
```

Eso descarga el instalador de la última release y lo ejecuta.

### Alternativa manual

Los usuarios también pueden ir a **GitHub → Releases** y descargar el `.exe` directamente.

## Project Structure

```
SakeAnime/
├── apps/
│   └── desktop/          # Electron + React app
│       ├── electron/     # Main process (Electron)
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── services/
│       │   └── extensions/
│       └── ...
└── packages/             # Shared packages
```

## License

MIT
