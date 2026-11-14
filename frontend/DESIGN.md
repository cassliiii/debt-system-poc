---
version: alpha
name: SIRD-institucional
description: "Sistema de diseño para el Sistema Integrado de Reporte de Deudas: una herramienta de trabajo para personal de una entidad pública (atención al ciudadano, operadores de área, administración TI), no un sitio público. Parte de la disciplina de Carbon (rejilla de 4px, tablas densas, geometría plana, sin sombras) pero cambia la identidad: tipografía Public Sans en lugar de Plex, granate institucional en lugar de azul, esquinas de 2px, controles con borde completo y mensajes en español formal. Prioriza la lectura de datos (importes, estados de mora, observaciones de calidad de datos) sobre la presentación."

colors:
  primary: "#7E1F2A"
  primary-hover: "#641922"
  primary-pressed: "#4B1219"
  on-primary: "#ffffff"
  primary-tint: "#f6e9eb"
  ink: "#1f2328"
  ink-muted: "#4a5057"
  ink-subtle: "#626971"
  canvas: "#ffffff"
  surface-1: "#f1f2f3"
  surface-2: "#e3e5e8"
  hairline: "#d0d3d6"
  control-border: "#7a828a"
  inverse-canvas: "#1f2328"
  inverse-ink: "#ffffff"
  success: "#1e6b35"
  success-bg: "#e5f2e9"
  warning: "#7a4e00"
  warning-bg: "#fff1cc"
  warning-border: "#d9a100"
  error: "#b42318"
  error-bg: "#fdecea"
  info: "#1f5f99"
  info-bg: "#e6eff8"

typography:
  page-title:
    fontFamily: Public Sans
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.29
    letterSpacing: 0
  section-title:
    fontFamily: Public Sans
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.36
    letterSpacing: 0
  subsection:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-strong:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0
  label:
    fontFamily: Public Sans
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 0
  table:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0
  table-head:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.43
    letterSpacing: 0
  helper:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0
  caption:
    fontFamily: Public Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.38
    letterSpacing: 0
  button:
    fontFamily: Public Sans
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 0
  figure:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0
  system-name:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0

rounded:
  none: 0px
  xs: 2px
  sm: 4px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px

components:
  app-header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.system-name}"
    rounded: "{rounded.none}"
    height: 64px
    padding: 0 24px
  sidebar:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 16px 0
  sidebar-item:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    height: 44px
    padding: 0 24px
  sidebar-item-active:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.none}"
    height: 44px
    padding: 0 24px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.xs}"
    height: 44px
    padding: 0 20px
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.xs}"
    height: 44px
    padding: 0 20px
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.xs}"
    height: 44px
    padding: 0 20px
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.xs}"
    height: 44px
    padding: 0 20px
  button-link:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: 0
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    height: 44px
    padding: 0 12px
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    height: 44px
    padding: 0 12px
  text-input-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    height: 44px
    padding: 0 12px
  file-dropzone:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    padding: 32px
  panel:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    padding: 24px
  login-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    padding: 32px
  alert-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.helper}"
    rounded: "{rounded.xs}"
    padding: 12px 16px
  alert-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.helper}"
    rounded: "{rounded.xs}"
    padding: 12px 16px
  alert-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.helper}"
    rounded: "{rounded.xs}"
    padding: 12px 16px
  alert-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.helper}"
    rounded: "{rounded.xs}"
    padding: 12px 16px
  table-head:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.table-head}"
    rounded: "{rounded.none}"
    height: 40px
    padding: 0 12px
  table-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.table}"
    rounded: "{rounded.none}"
    height: 44px
    padding: 0 12px
  table-row-selected:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.table}"
    rounded: "{rounded.none}"
    height: 44px
    padding: 0 12px
  chip-base:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 2px 8px
  chip-interes:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 2px 8px
  chip-vigente:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 2px 8px
  chip-por-vencer:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 2px 8px
  chip-vencida:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 2px 8px
  chip-coactiva:
    backgroundColor: "{colors.inverse-canvas}"
    textColor: "{colors.inverse-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 2px 8px
  modal:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 32px
---

## Overview

Este sistema se usa dentro de una oficina: personal que consulta deudas de papeletas mientras atiende a una persona, operadores que cargan padrones en CSV desde distintas áreas, y administradores de TI. Nadie "navega" el sitio ni se deja convencer por él. El diseño existe para que se lea rápido un importe, se detecte un dato dudoso y se confirme una acción sin equivocarse.

**Relación con Carbon (IBM).** Se conservan los principios que sirven para software institucional: rejilla de 4px, geometría plana, jerarquía por borde y cambio de superficie en vez de sombras, tablas densas y una sola acción primaria por pantalla. Todo lo que daba identidad a IBM se reemplaza:

| Aspecto                  | Carbon / IBM                         | Este sistema                                         |
| ------------------------ | ------------------------------------ | ---------------------------------------------------- |
| Tipografía               | IBM Plex Sans, display en peso 300   | Public Sans, títulos en peso 600, sin display grande |
| Color de acción          | Azul IBM `#0f62fe`                   | Granate institucional `#7E1F2A`                      |
| Esquinas                 | 0px en todo                          | 2px en controles y paneles, 4px solo en diálogos     |
| Campos de texto          | Fondo gris con línea inferior        | Fondo blanco con borde completo de 1px               |
| Superficie base          | Blanco y gris neutro                 | Blanco y gris neutro levemente frío, sin tonos crema |
| Escala                   | 76px de hero, pensada para marketing | Máximo 28px, pensada para aplicación                 |
| Interlineado de tracking | `letter-spacing: 0.16px`             | Sin tracking                                         |

**Características clave:**

- Una sola familia tipográfica (Public Sans). La jerarquía sale de tamaño y peso, no de cambiar de fuente.
- Un solo color de acción: el granate. Se reserva para el botón primario, enlaces y fila seleccionada.
- El estado de una deuda se lee por palabra y color a la vez; el color nunca va solo.
- Sin sombras, sin degradados, sin ilustraciones decorativas, sin emojis.
- Los datos dudosos no se ocultan: se muestran con su observación (los padrones de origen tienen DNI de 6 dígitos, nombres vacíos o con números).

## Colors

### Marca y acción

- **Granate** (`{colors.primary}` #7E1F2A): botón primario, enlaces, foco de navegación activa, borde superior del encabezado. Es un granate oscuro, no terracota ni rojo vivo.
- **Granate hover** (`{colors.primary-hover}`) y **pressed** (`{colors.primary-pressed}`): estados del botón primario.
- **Granate tenue** (`{colors.primary-tint}`): fondo de fila seleccionada y de ítem activo del menú.

### Superficies y bordes

- **Canvas** (`{colors.canvas}`): fondo de paneles, tablas, campos y encabezado.
- **Surface 1** (`{colors.surface-1}`): fondo general de la aplicación, menú lateral, cabecera de tablas, zona de carga de archivos.
- **Surface 2** (`{colors.surface-2}`): chips neutros, barra de progreso vacía, separadores gruesos.
- **Hairline** (`{colors.hairline}`): bordes de paneles, filas de tabla, divisores.
- **Control border** (`{colors.control-border}`): borde de campos y botones secundarios. Es más oscuro que el hairline para cumplir 3:1 de contraste en componentes.

### Texto

- **Ink** (`{colors.ink}`): texto principal y títulos.
- **Ink muted** (`{colors.ink-muted}`): texto secundario y menú inactivo.
- **Ink subtle** (`{colors.ink-subtle}`): ayudas y metadatos. No bajar de este tono sobre fondo blanco.

### Semánticos

Cada estado tiene texto, fondo suave y siempre un icono y una palabra.

- **Éxito** `{colors.success}` / `{colors.success-bg}`: carga completada, deuda vigente.
- **Advertencia** `{colors.warning}` / `{colors.warning-bg}` / `{colors.warning-border}`: intereses, deuda por vencer, datos con observaciones.
- **Error** `{colors.error}` / `{colors.error-bg}`: validación fallida, deuda vencida, acción destructiva.
- **Información** `{colors.info}` / `{colors.info-bg}`: avisos neutros, uso del sistema.
- **Cobranza coactiva** usa `{colors.inverse-canvas}` con texto blanco. Es el estado más grave y debe distinguirse de "vencida", por eso no es otro rojo.

> **Regla granate y rojo de error.** Son familias cercanas. Nunca uses el granate para comunicar un error ni el rojo de error para una acción normal. Los errores siempre llevan icono, texto y borde; el botón primario nunca lleva icono de alerta.

## Typography

### Familia

- **Public Sans**, gratuita en Google Fonts (licencia SIL OFL), diseñada para servicios de gobierno. Fallback: `"Source Sans 3", "Segoe UI", Arial, sans-serif`.
- Activar `font-variant-numeric: tabular-nums` en tablas, importes, DNI y números de papeleta para que las columnas alineen. No se usa fuente monoespaciada.

### Jerarquía

| Token                        | Tamaño | Peso | Interlineado | Uso                                   |
| ---------------------------- | ------ | ---- | ------------ | ------------------------------------- |
| `{typography.page-title}`    | 28px   | 600  | 1.29         | Título de pantalla (una por pantalla) |
| `{typography.section-title}` | 22px   | 600  | 1.36         | Secciones dentro de una pantalla      |
| `{typography.subsection}`    | 18px   | 600  | 1.4          | Título de panel o diálogo             |
| `{typography.body-lg}`       | 18px   | 400  | 1.5          | Texto introductorio breve             |
| `{typography.body}`          | 16px   | 400  | 1.5          | Texto general                         |
| `{typography.body-strong}`   | 16px   | 600  | 1.5          | Énfasis, ítem activo del menú         |
| `{typography.label}`         | 15px   | 600  | 1.33         | Etiquetas de campos                   |
| `{typography.table}`         | 14px   | 400  | 1.43         | Celdas                                |
| `{typography.table-head}`    | 14px   | 600  | 1.43         | Encabezados de columna                |
| `{typography.helper}`        | 14px   | 400  | 1.43         | Ayudas y mensajes                     |
| `{typography.caption}`       | 13px   | 400  | 1.38         | Chips, fecha de actualización         |
| `{typography.button}`        | 15px   | 600  | 1.33         | Botones                               |
| `{typography.figure}`        | 24px   | 600  | 1.25         | Importes totales                      |

### Principios

- Todo en **minúscula tipo oración**. Nada de etiquetas en mayúsculas ni encabezados con tracking amplio.
- Líneas de lectura de máximo 75 caracteres en texto corrido.
- Sin acento tipográfico en una sola palabra de un título.
- Los importes van con `S/` delante, dos decimales y alineados a la derecha.

## Layout

### Estructura de la aplicación

```
┌──────────────────────────────────────────────────────────┐
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬ borde superior granate 4px ▬▬▬▬▬▬▬▬▬▬▬▬▬ │
│ Entidad / Sistema                      Usuario  Rol  Salir│
├────────────┬─────────────────────────────────────────────┤
│ Menú       │  Título de pantalla                         │
│ lateral    │  Contenido en paneles                       │
│ 240px      │  máx. 1200px                                │
└────────────┴─────────────────────────────────────────────┘
```

- **Encabezado** `{components.app-header}`: fondo blanco, 4px de granate arriba, 1px hairline abajo. A la izquierda el nombre de la entidad y del sistema; a la derecha nombre de usuario, rol y "Cerrar sesión" como botón de texto.
- **Menú lateral** `{components.sidebar}` de 240px. Entradas según rol: Consulta de deuda, Carga de datos, Observaciones, Administración. Se colapsa a menú superior por debajo de 768px.
- **Contenido**: alineado a la izquierda, máximo 1200px en pantallas con tablas y 640px en formularios.

### Espaciado

- Base de 4px. Tokens: `{spacing.xxs}` 4 · `{spacing.xs}` 8 · `{spacing.sm}` 12 · `{spacing.md}` 16 · `{spacing.lg}` 24 · `{spacing.xl}` 32 · `{spacing.xxl}` 48.
- Padding de panel: 24px. Separación entre paneles: 24px. Separación entre campo y campo: 24px. Entre etiqueta y campo: 8px.
- Alturas táctiles: botones y campos de 44px.

### Alineación

Todo se alinea a la izquierda. No centrar bloques de texto ni títulos, salvo la tarjeta de inicio de sesión como bloque.

## Elevation & Depth

| Nivel | Tratamiento                                           | Uso                                                       |
| ----- | ----------------------------------------------------- | --------------------------------------------------------- |
| 0     | Sin borde                                             | Texto, fondo general                                      |
| 1     | Borde 1px `{colors.hairline}` sobre `{colors.canvas}` | Paneles, tablas, tarjeta de login                         |
| 2     | Fondo `{colors.surface-1}`                            | Menú lateral, cabecera de tabla, zona de carga            |
| 3     | Sombra única `0 8px 24px rgba(31,35,40,0.20)`         | Solo diálogos modales, con capa de fondo semitransparente |

Sin degradados, sin sombras en paneles ni botones, sin efectos al pasar el cursor en paneles.

## Shapes

- Controles, paneles, chips y alertas: **2px** (`{rounded.xs}`).
- Diálogos modales: **4px** (`{rounded.sm}`).
- Tablas y menú: sin radio.
- No usar `{rounded.pill}` en botones ni en chips de estado.

## Components

### Botones

- **`button-primary`**: granate sólido, texto blanco, 44px de alto. **Una por pantalla**: "Consultar", "Subir archivo", "Ingresar".
- **`button-secondary`**: blanco con borde 1px `{colors.control-border}` y texto `{colors.ink}`. Para "Cancelar" y "Volver".
- **`button-danger`**: rojo de error. Solo para acciones destructivas ("Eliminar carga").
- **`button-link`**: texto granate subrayado. Para acciones dentro de texto o filas.
- Deshabilitado: fondo `{colors.surface-2}`, texto `{colors.ink-subtle}`, `cursor: not-allowed`. Debe explicar por qué con texto de ayuda cercano.
- Etiquetas con verbo y objeto: "Consultar deuda", "Subir archivo", "Descargar observaciones". Nada de "Enviar" o "Aceptar" sin contexto. Sin flechas ni símbolos al final.

### Campos de formulario

- **`text-input`**: fondo blanco, borde 1px `{colors.control-border}`, 44px de alto, 12px de padding horizontal.
- **Etiqueta siempre visible** encima (`{typography.label}`). El placeholder nunca reemplaza a la etiqueta; solo muestra un ejemplo.
- **Foco** `text-input-focused`: contorno de 3px `{colors.ink}` con separación de 2px. Debe verse en teclado.
- **Error** `text-input-error`: borde 2px `{colors.error}`, fondo `{colors.error-bg}`, mensaje debajo con icono y texto ("El DNI debe tener 8 dígitos").
- DNI: `inputmode="numeric"`, `maxlength=8`, ancho fijo cercano a 12 caracteres.
- Selectores (Área) con el mismo aspecto que el campo de texto y flecha propia.

### Zona de carga de archivos

`file-dropzone`: fondo `{colors.surface-1}`, borde discontinuo 1px `{colors.control-border}`, texto "Arrastre el archivo CSV o seleccione uno", botón secundario "Seleccionar archivo". Muestra nombre y tamaño al elegir.

### Paneles

`panel`: fondo blanco, borde 1px hairline, 24px de padding. Un panel agrupa un tema. No apilar paneles idénticos solo para llenar espacio.

### Alertas y resumen de errores

- Estructura: icono, título corto en peso 600, una frase de explicación y una acción si corresponde.
- Borde izquierdo de 4px en el color semántico, fondo suave, texto `{colors.ink}`.
- **Resumen de errores** (formularios): alerta de error al inicio con el texto "Hay N problemas" y enlaces a cada campo. Recibe el foco al aparecer.
- Los errores no piden disculpas ni son vagos: dicen qué pasó y cómo corregirlo.

### Tablas de datos

- Cabecera `table-head` en `{colors.surface-1}`, texto en peso 600, borde inferior 2px `{colors.ink}`.
- Filas de 44px, separadas por 1px hairline, sin cebra. Hover con `{colors.surface-1}`.
- Fila seleccionada: fondo `{colors.primary-tint}` y barra izquierda de 3px granate.
- Importes alineados a la derecha, con `tabular-nums`. Texto alineado a la izquierda.
- Con más de 50 filas: paginación inferior y contador "Mostrando 1 a 50 de 12 460". Con 1M de registros no se renderiza todo: paginar en servidor.
- Tabla ancha: scroll horizontal dentro de su contenedor, primera columna fija.
- Vacía: un texto que diga qué falta y qué hacer ("No hay deudas registradas para este DNI").

### Chips de estado

Etiquetas de 13px, sin mayúsculas, con texto siempre. Estados de deuda y tipo de monto:

- **Base** (`chip-base`): neutro.
- **Interés** (`chip-interes`): advertencia suave.
- **Vigente** (`chip-vigente`): verde suave.
- **Por vencer** (`chip-por-vencer`): ámbar, con los días restantes ("Vence en 5 días"). El proceso actual no avisa de este estado; aquí debe ser visible.
- **Vencida** (`chip-vencida`): rojo suave.
- **En cobranza coactiva** (`chip-coactiva`): oscuro con texto blanco.

### Diálogos

`modal`: ancho 480px, título, texto, dos botones (secundario a la izquierda, primario a la derecha). Se cierran con Escape y devuelven el foco al elemento que los abrió. Se usan solo para confirmar acciones irreversibles y avisar de caducidad de sesión.

### Progreso

Barra determinada de 8px: relleno `{colors.ink}` sobre `{colors.surface-2}`, con texto "Procesando 340 000 de 1 000 000 registros". Sin animación decorativa.

## Patrones de pantalla

### Inicio de sesión

Esta pantalla identifica a la entidad y no vende nada.

```
[encabezado igual que en la app, sin menú ni usuario]

          ┌────────────────────────────────┐
          │ Iniciar sesión                 │
          │ Acceso para personal autorizado│
          │                                │
          │ Usuario                        │
          │ [____________________________] │
          │ Contraseña                     │
          │ [______________________][Mostrar]│
          │                                │
          │ [        Ingresar            ] │
          │                                │
          │ ¿Olvidó su contraseña?         │
          │ Comuníquese con la mesa de     │
          │ ayuda de TI.                   │
          └────────────────────────────────┘
          Uso exclusivo del personal. Las acciones quedan registradas.
```

- Fondo de página `{colors.surface-1}`; tarjeta `login-card` de 420px, centrada horizontalmente y a 64px del encabezado.
- Título en `{typography.page-title}`, sin logotipo grande ni ilustración.
- **Usuario** con `autocomplete="username"`. **Contraseña** con `autocomplete="current-password"` y botón de texto "Mostrar" / "Ocultar" (no solo un icono).
- Botón "Ingresar" ocupa todo el ancho. Es la única acción primaria.
- **Error de credenciales:** resumen de errores con el texto "Usuario o contraseña incorrectos". No indicar cuál de los dos falló.
- **Bloqueo temporal:** alerta de advertencia con "Demasiados intentos. Intente de nuevo en 10 minutos o comuníquese con TI."
- **Aviso de uso**: texto de 13px en `{colors.ink-subtle}` bajo la tarjeta.
- **Sesión:** diálogo de caducidad 60 segundos antes del cierre automático con "Continuar sesión" y "Cerrar sesión".
- Tras ingresar se redirige según rol: Atención al ciudadano va a Consulta de deuda; Operador de área va a Carga de datos; Administrador TI va a Administración.
- En el encabezado, el rol aparece junto al nombre ("María Pérez, Operador de área") y la opción "Cerrar sesión".

### Consulta de deuda (atención al ciudadano)

1. Título "Consulta de deuda". Campo DNI de 8 dígitos y botón primario "Consultar deuda".
2. Resultado en panel: nombre y DNI como título; debajo, "Datos consolidados al 12/11/2026 a las 06:00. Se actualizan una vez al día."
3. **Totales** en lista de descripción, no en tarjetas decorativas: Deuda base, Intereses y **Total a pagar**. El total lleva borde superior 2px `{colors.ink}` y `{typography.figure}`.
4. Tabla: Área, N.º de papeleta, Tipo, Concepto, Estado, Vence, Monto.
5. Si parte de la información proviene de padrones aún no validados, alerta de advertencia: "Algunas papeletas están pendientes de verificación en el área de origen".
6. Acciones secundarias: "Imprimir reporte" y "Nueva consulta".

### Carga de datos (operador de área)

Es una secuencia real, por eso sí se numera:

1. **Seleccionar** área y archivo CSV.
2. **Revisar**: informe de validación con totales ("12 460 válidos, 318 con observaciones, 42 rechazados") y tabla de observaciones: fila, campo, problema ("DNI de 6 dígitos", "Nombre vacío"), gravedad, acción sugerida.
3. **Confirmar**: botón primario "Confirmar carga". Queda deshabilitado mientras haya filas rechazadas sin revisar, con el motivo escrito al lado.

- Resultado: alerta de éxito con la cantidad de registros insertados y el enlace "Descargar observaciones".
- No usar iconos de emoji (✅ ❌). Usar iconos de línea.

## Contenido y tono

- Español formal, trato de usted, verbos en imperativo cortés ("Ingrese su DNI").
- Sin exclamaciones, sin emojis, sin humor.
- Fechas `dd/mm/aaaa`, horas de 24 horas, importes `S/ 1 234,50` según la convención que adopte el sistema (elegir una y mantenerla).
- Cada acción conserva su nombre en todo el flujo: si el botón dice "Confirmar carga", el aviso dice "Carga confirmada".
- Los mensajes de error y las pantallas vacías explican causa y siguiente paso.

## Accesibilidad

- Contraste mínimo 4.5:1 en texto y 3:1 en bordes de controles e iconos.
- El estado nunca se comunica solo por color: siempre palabra e icono.
- Foco visible en todos los elementos interactivos (contorno de 3px `{colors.ink}`; en fondos oscuros, blanco).
- Todo el flujo es operable con teclado; las tablas tienen `<caption>` y cabeceras con `scope`.
- Los mensajes dinámicos (resultado de consulta, errores, progreso) se anuncian con `aria-live`.
- Respetar `prefers-reduced-motion`. No hay animaciones de entrada.
- Referencia normativa: el lineamiento de accesibilidad digital de la PCM (gob.pe) y WCAG 2.1 AA.

## Do's and Don'ts

### Do

- Usa el granate solo para la acción principal, los enlaces y la fila seleccionada.
- Muestra siempre la fecha y hora de la última actualización de los datos.
- Usa `tabular-nums` en todo lo numérico y alinea importes a la derecha.
- Pon una sola acción primaria por pantalla.
- Muestra los datos inconsistentes con su observación en lugar de esconderlos.
- Mantén etiquetas visibles encima de cada campo.

### Don't

- No uses degradados, sombras en paneles ni esquinas muy redondeadas.
- No uses navy, azul IBM ni teal, ni un segundo color de marca.
- No uses emojis como iconos ni como indicadores de estado.
- No pongas etiquetas en mayúsculas ni encabezados pequeños sobre cada título.
- No uses fondos crema ni grises con tinte cálido.
- No repitas tarjetas idénticas en rejilla para rellenar la pantalla.
- No uses el granate para errores ni el rojo de error para acciones normales.
- No ocultes el motivo de un botón deshabilitado.
- No mezcles el aspecto del sistema con el estilo de IBM u otra marca comercial.

## Responsive

| Nombre           | Ancho        | Cambios                                    |
| ---------------- | ------------ | ------------------------------------------ |
| Escritorio ancho | 1200px y más | Menú lateral fijo y contenido hasta 1200px |
| Escritorio       | 1024px       | Menú lateral fijo                          |
| Tablet           | 768px        | Menú lateral colapsa a botón de menú       |
| Móvil            | 360px        | Una columna; tablas con scroll horizontal  |

- El uso principal es en escritorio dentro de la oficina. Móvil debe funcionar, pero no es el objetivo del diseño.
- Objetivos táctiles de 44px mínimo.
- El título baja de 28px a 24px en móvil.

## Iteration Guide

1. Trabaja una pantalla a la vez y referencia cada pieza por su token (`button-primary`, `table-row`, `chip-por-vencer`).
2. Antes de añadir un color nuevo, pregúntate si el granate, un gris o un semántico ya lo resuelve.
3. Un estado nuevo necesita texto, icono y color; si no tiene los tres, no se añade.
4. Las variantes nuevas se agregan como entradas aparte (`button-primary-pressed`, `text-input-error`).
5. Si una pantalla se parece a una web comercial (hero grande, tarjetas con sombra, degradado), corrige antes de seguir.
6. Valida el archivo con `npx @google/design.md lint DESIGN.md` después de editar.

## Known Gaps

- No se definen aún pantallas de administración de usuarios, auditoría ni reportes de morosidad.
- No hay escala de iconos definida; se recomienda un set de línea de 20px (Lucide o Phosphor) con trazo de 1.5px.
- Modo oscuro no incluido.
- Si la entidad ya tiene identidad gráfica oficial (escudo, color), sustituir el granate y revisar el contraste de todos los estados.
- La tipografía debe cargarse localmente si el sistema va a operar sin salida a internet (despliegue on-premise).
