---
name: frontend-ux-only
description: Skill de alcance para sesiones Open Design orientadas exclusivamente a diseño y UX del frontend. Limita al agente a cambios visuales/UX sin tocar backend, auth, contratos API, lógica de negocio ni arquitectura. Obliga a reportar hallazgos técnicos detectados sin ejecutarlos. Úsala al iniciar una sesión centrada en frontend visual donde se requiera explícitamente no abrir scope técnico.
---

# Frontend-ux-only - Skill de alcance para Open Design

Esta skill define los límites del agente en sesiones dedicadas exclusivamente al diseño visual y experiencia de usuario del frontend. Su propósito es mantener la sesión acotada a UI/UX pura, evitando que el agente derive hacia cambios de backend, seguridad, contratos API o arquitectura.

**Principio rector**: El agente trabaja solo en lo visual. Todo hallazgo técnico se reporta, no se ejecuta.

---

## §1 — Alcance permitido

El agente puede modificar **exclusivamente** estos aspectos:

- **Layout** y estructura de página (grids, secciones, espaciado entre áreas)
- **Spacing** (padding, margin, gaps, padding entre componentes)
- **Tipografía** (fuentes, tamaños, pesos, tracking, line-height, alineación de texto) — siguiendo la guía de `sunat-ui-design`
- **Colores** (fondo, texto, acentos, borders) — **siguiendo la paleta definida en `sunat-ui-design`, sin introducir nuevas tonalidades**
- **Componentes visuales** (cards, modals, tabs, tooltips, badges, botones, inputs, selects, toggles)
- **Navegación** (sidebar, tabs, breadcrumbs, jerarquía visual de navegación)
- **Responsive/mobile** (breakpoints, layouts adaptativos, comportamiento en viewport 375px)
- **Formularios** (layout de campos, labels, placeholders, mensajes de error/validación visual, estados de botones)
- **Tablas** (alineación, espaciado de columnas, hover states, bordes, estados vacíos) — **siguiendo `sunat-ui-design`**
- **Dashboards** (layout de métricas, tarjetas de KPIs, jerarquía visual de datos)
- **Consistencia visual** (uniformidad de estilos entre páginas, misma experiencia en flows similares)

---

## §2 — Alcance prohibido

Está terminantemente prohibido modificar, crear o alterar:

- ❌ **Backend** — ningún archivo bajo `backend/`, `api/`
- ❌ **Autenticación** — lógica de login, registro, almacenamiento de tokens, headers `Authorization`
- ❌ **Middleware** — `middleware.ts`, `next.config.ts` (CSP, redirects, rewrites)
- ❌ **Contratos API** — `api-types.ts`, `api-client.ts`, `api-endpoints.ts`, `frontend-contract-notes.md`
- ❌ **Lógica de negocio** — cálculo de IGV, flujos condicionales que afecten a datos transaccionales, validación de negocio
- ❌ **Seguridad** — CSP, validación de inputs con intención de defensa, sanitización, manejo de sesión
- ❌ **Tests** — unit tests, integration tests, E2E, contract tests
- ❌ **Refactors técnicos** — renombrar variables, reestructurar funciones, cambiar estructura de carpetas
- ❌ **Cleanup profundo** — eliminar código muerto más allá de CSS no usado, reducir bundle size, optimizar imágenes
- ❌ **Supabase** — `supabase-ornamental.ts` (`NO TOCAR`)

---

## §3 — Reporte obligatorio al cierre

El agente debe entregar **siempre** este reporte al terminar la sesión, sin excepción:

### Cambios visuales realizados

Lista con formato: `[archivo] — [qué cambió] — [por qué]`

```
src/app/page.tsx — Ajuste de spacing del hero section — Mejor jerarquía visual
src/components/button.tsx — Hover state más notorio — Accesibilidad y feedback
```

### Validación mobile

Confirmar cómo se comporta la interfaz modificada en viewport de **375px**. No es necesario test con dispositivo real, pero sí verificar mentalmente que:

- Las columnas colapsan correctamente
- Las tablas horizontales scrollean o usan card layout
- Los modals no se salen del viewport
- Los botones tienen área táctil suficiente (mínimo 44px height)
- Las fuentes escalan sin desbordar

### Hallazgos técnicos detectados (no ejecutados)

Lista puntual, una línea por hallazgo, con este formato:

```
[archivo:línea] — [tipo de problema] — [skill o acción sugerida]
```

**Ejemplos:**
```
src/lib/api-client.ts:17 — token en localStorage sin httpOnly — ver secure-frontend R1.1
src/app/dashboard/page.tsx:34 — métrica sin tooltip explicativo — pendiente de UX copy
next.config.ts:15 — CSP sin frame-ancestors — ver secure-frontend R3.4
```

El hallazgo se reporta **sin ejecutar la corrección**. El agente solo observa y documenta.

---

## §4 — Límites duros (archivos intocables)

Estos archivos **no se modifican bajo ninguna circunstancia**:

| Archivo | Razón |
|---|---|
| `frontend/src/lib/api-types.ts` | Contrato backend — cualquier cambio debe ir por `api-contracts-and-regressions` |
| `frontend/src/lib/api-client.ts` | Cliente de API — contiene auth y base URL |
| `frontend/src/lib/api-endpoints.ts` | Catálogo de rutas |
| `frontend/src/lib/frontend-contract-notes.md` | Documentación de contrato |
| `frontend/src/lib/supabase-ornamental.ts` | NO se usa para auth; no tiene rol en sesiones UX |
| `frontend/src/middlewares.ts` | Protección de rutas, seguridad |
| `frontend/next.config.ts` | CSP, rewrites, redirects |
| `backend/**/*` | Todo código del servidor |
| `*.test.*`, `__test__/**` | Test files |

Si el agente cree que necesita modificar alguno de estos archivos, debe reportarlo en "Hallazgos técnicos detectados" y detenerse.

---

## §5 — Relación con tiene skills existentes

### `sunat-ui-design`

**Complementario**. No son rivales.
- `sunat-ui-design` es la **guía de estilo** (cómo aplicar diseño → paleta, tipografía, badges, tablas).
- `frontend-ux-only` es el **límite de alcance** (qué se puede tocar → solo visual, no backend, no auth).

Si la sesión requiere cambiar colores, tipografía o badges, se siguen las reglas de `sunat-ui-design`. Nunca se inventan nuevas paletas ni se ignoran las definiciones existentes.

### `secure-frontend`, `secure-backend`, `api-contracts-and-regressions`

El agente los conoce pero **no loscute**. Cuando detecta problemas que entran en uno de esos dominios, los reporta en "Hallazgos técnicos" y redirige al skill correspondiente.

### `release-quality-gates`

`frontend-ux-only` **no exime** de los gates del proyecto. El agente debe seguir pasando `npm run lint` y `npm run build` tras cada cambio visual.

### `orchestrator-rules` en `AGENTS.md`

La auditoría del orquestador (visual + CRO) **sigue siendo obligatoria**. Sin embargo, las soluciones resultantes se limitan a lo visual/UX: si el veredicto CRO sugiere cambios de copy o de lógica de formulario que no involucran backend, el agente puede implementarlos. Si la solución sugerida implicaría `api-*`, backend o auth, se reporta como hallazgo técnico.