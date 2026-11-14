export const APP_NAME = 'Sistema Integrado de Reporte de Deudas'

export const ENTIDAD = 'Entidad'

export const MAX_UPLOAD_MB =
  Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 500

export const SESSION_MINUTES = 15

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const API_URL = import.meta.env.VITE_API_URL ?? ''

export const USE_MOCK_INGESTA =
  (import.meta.env.VITE_USE_MOCK_INGESTA ?? 'true') === 'true'

export const INGESTA_BASE_URL = import.meta.env.VITE_INGESTA_BASE_URL ?? ''

export const POLL_INTERVAL_MS = 1500
