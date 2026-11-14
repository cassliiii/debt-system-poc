# SIRD — Frontend

Aplicación React (Vite, JavaScript) del Sistema Integrado de Reporte de Deudas.

## Requisitos

- Node.js 20 o superior.
- npm.
- Opcional: backend Express en `http://localhost:8080`.

## Comandos

```bash
npm install     # instala dependencias
npm run dev     # servidor de desarrollo en http://localhost:5173
npm run build   # compila la aplicación en dist/
npm run lint    # revisa el código con ESLint
```

## Variables de entorno

Copie `.env.example` a `.env` y ajuste los valores.

| Variable       | Descripción                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `VITE_API_URL` | URL base de la API. Vacío usa el mismo origen y el proxy hacia el backend.  |
| `VITE_USE_MOCK` | `true` usa datos simulados; `false` consume la API real.                   |

El servidor de desarrollo escucha en el puerto `5173` y reenvía las rutas `/api`
a `http://localhost:8080`.

## Modo mock

Con `VITE_USE_MOCK=true` los servicios de `src/services/` usan los datos de
`src/services/mock/` en lugar de llamar al backend. Los mocks respetan la misma
forma de respuesta que la API real, de modo que la interfaz puede desarrollarse
sin conexión al servidor. Para volver a la API real, establezca
`VITE_USE_MOCK=false`.
