---
name: secure-backend
description: Reglas de seguridad específicas para el backend API (FastAPI + Supabase PostgreSQL). Extiende secure-coding-standard. Úsala al crear o modificar routers, servicios, middlewares, modelos de BD, o al configurar integraciones externas. No la uses para reglas de seguridad genéricas (ver secure-coding-standard) ni para seguridad frontend (ver secure-frontend).
---

# Seguridad Backend — FastAPI + Supabase

Esta skill extiende `secure-coding-standard` con reglas específicas para backend. Toda regla aquí asume que las reglas de `secure-coding-standard` ya se aplican.

## 1. Autenticación JWT

- **Regla 1.1**: Verificar la firma del JWT usando el JWKS de Supabase o el secreto compartido (`SUPABASE_JWT_SECRET`). **Nunca** usar `jwt.decode(token, options={"verify_signature": False})` u otra forma de omisión de verificación.
- **Regla 1.2**: No existe fallback de autenticación. Si el token es inválido, expiró o está ausente, retornar `401 Unauthorized`. No asignar usuarios por defecto ni company_ids hardcodeados.
- **Regla 1.3**: Refrescar tokens expirados no es responsabilidad del backend. El frontend debe manejar el refresh mediante Supabase SSR.
- **Regla 1.4**: El `require_tenant` dependency injector debe fallar si no puede determinar `company_id`. No asignar valores por defecto.

## 2. Base de Datos (PostgreSQL + Supabase)

- **Regla 2.1**: Toda consulta a BD debe usar **parameterized queries** (cursor.execute con `%s` placeholders). Prohibida la interpolación de strings.
- **Regla 2.2**: No exponer el `SUPABASE_SERVICE_ROLE_KEY` en el código de aplicación. Si se requiere acceso admin, usar funciones server-side o RPC con SECURITY DEFINER bien acotado.
- **Regla 2.3**: Las conexiones a BD deben usar **connection pooling**. No abrir una conexión nueva por request. Usar `psycopg2.pool` o SQLAlchemy con pool configurado.
- **Regla 2.4**: Las políticas RLS son el segundo factor de defensa. El backend también debe filtrar por `company_id` explícitamente en cada consulta.
- **Regla 2.5**: Las migraciones de esquema deben ser idempotentes y versionadas. No ejecutar DDL directamente desde la aplicación.

## 3. API REST (FastAPI)

- **Regla 3.1**: Todo endpoint debe tener un schema Pydantic de request y response. No usar `Dict[str, Any]` como tipo de retorno en endpoints públicos.
- **Regla 3.2**: CORS en producción debe listar orígenes específicos. No usar `allow_origins=["*"]`. Separar configuración por entorno.
- **Regla 3.3**: Rate limiting por IP y por token. Sin límites, un endpoint `/consultar-doc` puede ser abusado para scraping de RUC/DNI.
- **Regla 3.4**: Timeouts explícitos en todas las llamadas HTTP externas. No usar valores por defecto del cliente HTTP. 30s para SUNAT SOAP, 10s para consultas RENIEC/SUNAT API, 10s para Gemini.

## 4. Archivos y Subidas

- **Regla 4.1**: Validar tipo MIME y tamaño máximo de archivos subidos. Rechazar archivos que no coincidan con lo esperado (imágenes, XML, PDF).
- **Regla 4.2**: Los archivos subidos deben almacenarse en R2 (o S3). No en el mismo servidor de aplicación ni en BD como base64.
- **Regla 4.3**: No ejecutar, interpretar ni renderizar archivos subidos sin sanitización previa. Los XML de comprobantes deben validarse contra el XSD de SUNAT antes de firmarse.

## 5. Integraciones Externas (SUNAT, Gemini, RENIEC)

- **Regla 5.1**: Las credenciales de integración (SOL user/pass, API keys) viajan en variables de entorno, no en BD en texto plano. Si están en BD, deben estar encriptadas.
- **Regla 5.2**: Toda integración SOAP (SUNAT) debe tener manejo de timeout, reintento (max 2) y degradación documentada.
- **Regla 5.3**: Las respuestas de servicios externos no deben cachearse sin invalidación explícita. Un RUC puede cambiar de estado tributario.
- **Regla 5.4**: No retornar datos mock o falsos cuando un servicio externo falla. Si Gemini no responde en OCR, retornar error 502. Si SUNAT no responde, retornar error con estado `PENDIENTE` y reintentar.

## 6. Configuración del Servidor

- **Regla 6.1**: No ejecutar el servidor como root. Usar un usuario no privilegiado en el contenedor.
- **Regla 6.2**: Deshabilitar el endpoint `/docs` (Swagger) en producción o protegerlo con autenticación.
- **Regla 6.3**: Configurar header `X-Content-Type-Options: nosniff` y `X-Frame-Options: DENY` en todas las respuestas.
- **Regla 6.4**: No exponer versiones de librerías ni del framework en headers de respuesta.

## 7. Reglas de Stack (FastAPI + Python)

- **Regla 7.1**: Usar `pydantic-settings` con `model_config = {"env_file": ".env"}` para configuración. No leer `os.getenv()` directamente en módulos.
- **Regla 7.2**: No usar `except Exception: pass`. Toda excepción debe al menos loguearse.
- **Regla 7.3**: Para tareas asíncronas (envío SOAP largo), usar un task queue (Celery, ARQ) o background task manager. No bloquear el event loop de FastAPI.
- **Regla 7.4**: No importar directamente en routers módulos de infraestructura (BD, R2). Usar servicios.
