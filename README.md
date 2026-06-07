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
