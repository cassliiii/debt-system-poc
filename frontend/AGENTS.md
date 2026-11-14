# AGENTS.md — Frontend del Sistema Integrado de Reporte de Deudas (SIRD)

## Proyecto

Aplicación React (Vite, JavaScript) para el sistema de reporte de deudas de papeletas. Reemplaza un portal HTML estático. El backend (Express 5, carpeta ../backend) ya existe y NO se modifica desde esta carpeta.

## Reglas obligatorias

1. Trabaja solo dentro de frontend/. No toques backend/, sql/, docs/, Dockerfile, docker-compose.yml ni .github/ salvo petición explícita.
2. No cambies contratos de API ni lógica de negocio. El frontend solo muestra y envía datos. No recalcules totales de deuda: se muestran tal como llegan.
3. Diseño: sigue DESIGN.md al pie de la letra. Todos los colores, tamaños, espaciados y radios salen de variables CSS definidas en src/styles/tokens.css. Prohibido: degradados, sombras (salvo el modal), esquinas de más de 2px (4px solo en el modal), emojis, etiquetas en mayúsculas, un segundo color de marca, centrar bloques de texto.
4. Una sola acción primaria (botón granate) por pantalla.
5. Tecnología: React + Vite + JavaScript con JSDoc para describir contratos. CSS puro, un archivo .css junto a cada componente. Sin Tailwind, sin librerías de UI, sin CDN ni recursos externos (despliegue on-premise sin internet; las fuentes vienen de @fontsource).
6. Nunca uses dangerouslySetInnerHTML ni innerHTML. Todo dato del backend se renderiza como texto.
7. Todo acceso HTTP pasa por src/services/. Los componentes y páginas no llaman a fetch directamente.
8. Modo mock: con VITE_USE_MOCK=true los servicios usan src/services/mock/. Los mocks respetan exactamente la forma de las respuestas del backend real.
9. Textos de interfaz en español formal (trato de usted), sin exclamaciones ni emojis. Fechas dd/mm/aaaa. Importes con Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).
10. Accesibilidad (WCAG 2.1 AA): etiquetas visibles, foco visible, el estado se comunica con palabra + icono + color, aria-live para mensajes dinámicos, todo operable con teclado.
11. Rutas con HashRouter (el servidor Express no tiene fallback para rutas del SPA).
12. Antes de dar una tarea por terminada ejecuta npm run lint y npm run build.

## Áreas

BD_Area1 = Fiscalización presencial (Sede Central). BD_Area2 = Fiscalización electrónica (Sede Norte). Los valores BD_Area1 y BD_Area2 se envían tal cual al backend y no se cambian.

## Contratos del backend (vigentes)

- GET /api/health -> { status, message }
- POST /api/debt/upload (multipart): file (CSV, máx. 5 MB, solo .csv) y area (BD_Area1 | BD_Area2). 200: { success, message, totalRegistros }. 400: { message, errors?: string[] }. 500: { message, details }.
- GET /api/debt/consulta/:dni (dni = 8 dígitos). 200: { success, data: { dni, nombre, deuda_base_total, interes_total, deuda_total, detalle: [{ area, num_papeleta, tipo_monto, concepto, monto }] } }. 400 DNI inválido; 404 sin registros; 500 error.
- CSV que exige el backend hoy (por nombre de cabecera, cualquier orden): dni, nombre, num_papeleta, tipo_monto, monto, concepto. Este contrato CAMBIARÁ al migrar el backend a on-premise: mantenlo aislado en src/config/csvContract.js y en la función adaptadora de src/services/debtService.js.

## Roles (simulados por ahora)

- atencion (Atención al ciudadano) -> /consulta
- operador (Operador de área) -> /carga
  No hay administrador ni gestión de roles.
