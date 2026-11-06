# Frontend — Sistema Integrado de Deudas

Aplicación React + Vite (JavaScript) con dos vistas:

- `/ingesta`: carga de padrones CSV por área.
- `/consulta`: consulta consolidada de deudas por DNI.

## Requisitos

- Node.js 20.19+ o 22.12+.
- Backend Express corriendo en `http://localhost:8080` para el modo real.

## Instalación

```powershell
npm install
```

## Desarrollo

```powershell
npm run dev
```

Vite corre en `http://localhost:5173` y redirige `/api` al backend local.

Para trabajar sin backend ni credenciales de GCP, crear `.env.local`:

```env
VITE_USE_MOCKS=true
```

## Build

```powershell
npm run build
npm run preview
```

## Lint

```powershell
npm run lint
```
