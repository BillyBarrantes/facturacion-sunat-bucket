# Frontend Contract Notes — Open Design

## Dominios reales (lo que existe)

| Dominio | Pantalla | Endpoints que usa |
|---|---|---|
| Auth | Home (`/`) | `POST /auth/login`, `POST /auth/register-company` |
| Dashboard | `/dashboard` | `GET /dashboard/metrics`, `POST /dashboard/ai-summary`, `GET /reports/sire-ventas/excel` |
| Comprobantes | `/billing/new` | `GET /comprobantes/correlativo/{tipo}/{serie}`, `GET /comprobantes/consultar-doc/{num}`, `POST /comprobantes/emitir` |
| Historial | `/billing/history` | `GET /comprobantes` |
| OCR Compras | `/expenses` | `POST /purchases/ocr` |

## Lo que NO existe en backend (NO inventar en UI)

- ❌ CRUD de clientes (no hay `POST /clientes`, `PUT /clientes/:id`, `DELETE /clientes/:id`)
- ❌ CRUD de productos (no hay `GET /products`, `POST /products`, etc.)
- ❌ Edición de comprobantes emitidos (no hay `PUT /comprobantes/:id`)
- ❌ Anulación de comprobantes (no hay `POST /comprobantes/:id/anular`)
- ❌ Envío por email desde backend (no hay `POST /comprobantes/:id/email`)
- ❌ WebSockets / tiempo real
- ❌ Roles y permisos configurables
- ❌ Paginación en listados (el backend devuelve todo)
- ❌ Filtros por query params en `GET /comprobantes` (no acepta `?tipo=` ni `?search=`)
- ❌ Endpoint público de consulta de RUC/DNI (no existe; el lookup va por el backend con auth)

## Auth

- Flujo: `POST /auth/login` o `POST /auth/register-company` → devuelve `access_token`
- El token se guarda en `localStorage` como `'sunat_token'`
- Cada request (excepto auth) envía `Authorization: Bearer <token>`
- Si no hay token, se envía `'test-token'` como fallback (solo si el backend acepta tokens de prueba)
- Ver `api-client.ts` para la implementación concreta

## Convención de nombres

- Backend responde en **snake_case**: `serie_numero`, `cliente_razon_social`, `importe_total`
- Usar `api-types.ts` como fuente de verdad de contratos
- No convertir a camelCase sin mapper explícito

## Manejo de errores

- Backend devuelve siempre `{ detail: string }` en errores 4xx/5xx
- Errores de red lanzan `ApiClientError` con `status` y `detail`
- El catch debe diferenciar entre error de red (no hay `status`) y error de API (tiene `status` y `detail`)

## View models locales

- `TicketModal` recibe un objeto transformado a camelCase en la prop `comprobante`
- Ese objeto NO es una respuesta del backend — es un view model local construido en cada pantalla
- Ver `ticket_modal.tsx` → `TicketModalProps['comprobante']`
