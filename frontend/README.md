# SIRD — Frontend

Aplicación React (Vite, JavaScript) del Sistema Integrado de Reporte de Deudas.

## Requisitos

- Node.js 20 o superior.
- npm.
- Opcional para modo real:
  - `consulta-service` en `http://localhost:8080`.
  - `ingesta-demo` en `http://localhost:8081`.

## Comandos

```bash
npm install     # instala dependencias
npm run dev     # servidor de desarrollo en http://localhost:5173
npm run build   # compila la aplicación en dist/
npm run preview # sirve localmente la compilación de dist/
npm run lint    # revisa el código con ESLint
```

## Variables de entorno

Copie `.env.example` a `.env` y ajuste los valores. Vite fija las variables `VITE_*` al compilar, así que reinicie `npm run dev` o vuelva a construir la imagen después de cambiarlas.

| Variable                 | Valor por defecto | Descripción                                                                                      |
| ------------------------ | ----------------- | ------------------------------------------------------------------------------------------------ |
| `VITE_API_URL`           | vacío             | URL base de la API de consulta. Vacío usa el mismo origen y el proxy.                            |
| `VITE_USE_MOCK`          | `false`           | `true` usa datos simulados de consulta; `false` consume `consulta-service` real.                |
| `VITE_USE_MOCK_INGESTA`  | `true`            | `true` usa la ingesta simulada; `false` consume `ingesta-demo` real.                              |
| `VITE_INGESTA_BASE_URL`  | vacío             | URL base de la ingesta. Vacío usa el mismo origen y el proxy.                                    |
| `VITE_MAX_UPLOAD_MB`     | `500`             | Tamaño máximo del CSV que acepta la interfaz, en MB.                                             |

La autenticación es siempre simulada en el frontend.

## Proxy de desarrollo

El servidor de Vite escucha en el puerto `5173` y reenvía:

| Ruta        | Destino                 |
| ----------- | ----------------------- |
| `/api`      | `http://localhost:8080` |
| `/ingestas` | `http://localhost:8081` |

En la imagen Docker, Nginx reenvía `/api` a `consulta-service:8080` y `/ingestas` a `ingesta-demo:8080`.

## Usuarios demo

| Usuario     | Rol                        | Área    | Clave      |
| ----------- | -------------------------- | ------- | ---------- |
| `atencion`  | Atención al ciudadano      | —       | `demo1234` |
| `operador1` | Operador de área           | `AREA1` | `demo1234` |
| `operador2` | Operador de área           | `AREA2` | `demo1234` |

## Cómo pasar la ingesta a modo real

### Desarrollo local

1. En `.env`, establezca `VITE_USE_MOCK_INGESTA=false`.
2. Deje `VITE_INGESTA_BASE_URL=` vacío para usar el proxy `/ingestas` hacia `http://localhost:8081`.
3. Inicie `ingesta-demo` en el puerto `8081`.
4. Reinicie `npm run dev` para que Vite tome las variables.

### Imagen Docker

Vite incorpora las variables en el momento de la compilación. Use `--build-arg`:

```bash
docker build \
  --build-arg VITE_USE_MOCK=false \
  --build-arg VITE_USE_MOCK_INGESTA=false \
  --build-arg VITE_INGESTA_BASE_URL= \
  --build-arg VITE_MAX_UPLOAD_MB=500 \
  -t sird-frontend ./frontend
```

## Pendiente para el equipo de backend

- `docker-compose.yml` no pasa los `--build-arg` al servicio `front`; hay que agregar los `build.args` correspondientes.
- Nginx espera el host `ingesta-demo:8080`, pero el servicio de Compose se llama `ingesta-java`; debe alinearse el nombre o agregarse un alias de red.
