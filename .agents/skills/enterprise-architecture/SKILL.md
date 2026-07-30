---
name: enterprise-architecture
description: Define y hace cumplir la visión arquitectónica del SaaS FACTURACION-SUNAT. Úsala al proponer nuevos componentes, modificar flujos de datos, agregar integraciones externas, cambiar patrones de despliegue, o cuando el agente deba decidir entre enfoques técnicos. No la uses para decisiones de UI/UX (ver sunat-ui-design) ni para reglas de seguridad puntuales (ver secure-*).
---

# Arquitectura Enterprise — FACTURACION-SUNAT SaaS

## 1. Capas y Boundaries

El sistema tiene **4 capas estrictas**. Ninguna capa puede saltarse a otra:

```
Presentación (Next.js) → API REST (FastAPI) → Servicios (Python) → Almacenamiento (Supabase/R2/SUNAT)
```

| Capa | Responsabilidad | Prohibiciones |
|---|---|---|
| **Presentación** | UI, estado de sesión SSR, routing, renderizado | NO contiene lógica de negocio, NO calcula IGV, NO decide estados SUNAT |
| **API (Routers)** | Validación de entrada, orquestación, respuesta | NO contiene lógica de dominio, NO llama a servicios externos directamente |
| **Servicios** | Lógica de negocio, integraciones externas, transforms | NO recibe requests HTTP, NO expone rutas |
| **Almacenamiento** | Persistencia, RLS, backups | NO contiene lógica de aplicación, NO triggers que modifiquen datos de negocio sin registro |

### Regla de capas
- Una capa solo puede comunicarse con la capa inmediatamente inferior.
- Excepción: el servicio `doc_lookup` puede llamar a APIs externas (SUNAT/RENIEC) sin pasar por almacenamiento.
- Prohibido: desde Presentación leer/escribir directamente a Supabase sin pasar por API (salvo auth de Supabase SSR).

## 2. Patrón Multi-Tenant

### Identidad del tenant
- El `company_id` se obtiene del token JWT verificado (nunca de un parámetro de ruta, query string ni body).
- Toda consulta a BD debe filtrar por `company_id`. Las políticas RLS de Supabase son el segundo factor de protección, no el único.

### Aislamiento
- Cada tenant tiene su propio correlativo de comprobantes. No existe un correlativo global.
- Los archivos en R2 se organizan por `{company_id}/{tipo}/{serie}-{numero}.xml`.
- Los templates XML, certificados CDT y logos son por tenant.

## 3. Flujos de Datos Críticos

### Emisión de comprobante
```
Frontend → POST /emitir → Router valida schema → Service construye XML → 
Service firma digital → Service envía SOAP a SUNAT → Service almacena en BD → 
Response con estado + hash_cpe → Frontend muestra resultado
```

### Consulta RUC/DNI
```
Frontend → GET /consultar-doc/{num} → Service lookup_document → 
1. Busca en BD local del tenant → 2. API externa SUNAT/RENIEC → Response
```

### OCR de compras
```
Frontend → POST /purchases/ocr → Service Gemini → 
Service extrae JSON → Almacena en tabla compras → Response
```

## 4. Decisiones Tecnológicas Vinculantes

| Decisión | Elección | Razón |
|---|---|---|
| Framework backend | FastAPI | Async support, validación Pydantic nativa, OpenAPI automático |
| Base de datos | PostgreSQL + Supabase | RLS nativo, auth integrado, buena DX |
| Almacenamiento de archivos | Cloudflare R2 (S3-compatible) | Sin cargo de egress, compatible S3, bajo costo |
| Frontend | Next.js App Router | SSR, React Server Components, Vercel deployment |
| Firma digital | signxml (XAdES) | Única biblioteca madura para XML Signature en Python |

## 5. Antipatrones Prohibidos

- **Conexiones directas a BD desde el frontend** — toda operación de datos pasa por la API.
- **Lógica de negocio en routers** — los routers solo validan y orquestan.
- **Caché de side-effect sin invalidación** — si se cachea un correlativo, invalidar al emitir.
- **Tokens de prueba en producción** — ningún entorno productivo acepta "test-token" ni fallbacks.
- **Dependencias de infraestructura embebidas en el código** — URLs de Supabase, R2, SUNAT van en variables de entorno, no en constantes.

## 6. Integraciones Externas — Reglas de Conexión

- Toda integración externa (SUNAT SOAP, Gemini, RENIEC) debe tener **timeout explícito** y **circuit breaker** o reintento controlado.
- Las credenciales de integraciones externas se rotan en el entorno, nunca en el código.
- Cada integración debe tener un **modo degraded** documentado: qué pasa si SUNAT no responde, si Gemini no tiene quota, si RENIEC está caído.
