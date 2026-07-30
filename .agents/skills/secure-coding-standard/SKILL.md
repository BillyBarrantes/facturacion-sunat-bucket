---
name: secure-coding-standard
description: Estándar de seguridad transversal para todo el código del proyecto FACTURACION-SUNAT. Aplica tanto a backend (Python/FastAPI) como a frontend (Next.js/React). Úsala como base antes de aplicar secure-backend o secure-frontend. No la uses para reglas específicas de framework (ver esas skills) ni para calidad de release (ver release-quality-gates).
---

# Estándar de Seguridad Transversal — FACTURACION-SUNAT

Esta skill define las reglas de seguridad que aplican a **todo el código**, independientemente del lenguaje o capa. Las skills `secure-backend` y `secure-frontend` extienden estas reglas con especificidad de framework.

## 1. Secrets y Credenciales

- **Regla 1.1**: Ningún secret puede existir como default en el código fuente. `config.py` no debe tener valores por defecto para `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD` ni ninguna clave de producción. Usar `os.getenv("VAR")` o `Field(validation_alias=...)` sin default.
- **Regla 1.2**: Los secrets en variables de entorno. Nunca en archivos fuera de `.env` (que debe estar en `.gitignore`).
- **Regla 1.3**: No loguear, imprimir ni exponer secrets en mensajes de error, respuestas HTTP ni trazas.
- **Regla 1.4**: Las claves de servicio (service_role, API keys) nunca se usan desde el frontend. Solo desde backend o funciones server-side.

## 2. Autenticación y Autorización

- **Regla 2.1**: No existen "tokens de prueba", "fallback users" ni "modo demo" que omitan la verificación de autenticación. Todo endpoint protegido debe verificar un JWT válido contra Supabase Auth.
- **Regla 2.2**: La verificación de JWT debe incluir firma (`verify_signature=True`). No aceptar JWTs sin verificar.
- **Regla 2.3**: Toda operación multi-tenant debe verificar que el `company_id` del token coincida con el recurso accedido. No confiar únicamente en RLS de Supabase (RLS es defensa en profundidad, no la única).
- **Regla 2.4**: No exponer el `service_role_key` de Supabase en ningún endpoint público.

## 3. Validación de Entrada

- **Regla 3.1**: Todo input externo debe validarse contra un schema explícito (Pydantic en backend, Zod en frontend si se usa). No confiar en tipos dinámicos.
- **Regla 3.2**: Rechazar entradas que excedan longitudes máximas razonables. Un RUC tiene 11 caracteres, un DNI 8, una razón social no debería exceder 255.
- **Regla 3.3**: Nunca concatenar strings para construir consultas SQL, XML, SOAP envelopes ni comandos shell. Usar siempre parameterized queries, templates con escape o builders.

## 4. Manejo de Errores

- **Regla 4.1**: Los errores devueltos al cliente nunca deben exponer detalles de implementación (stack traces, nombres de BD, IPs internas, versiones de librerías).
- **Regla 4.2**: Los errores internos deben loguearse con contexto suficiente para debugging, pero sin datos sensibles (secrets, datos personales del cliente).
- **Regla 4.3**: Las respuestas de error deben tener un código HTTP apropiado. No retornar 200 con `"success": False` como mecanismo de error. Usar 4xx para errores del cliente, 5xx para errores del servidor.

## 5. Dependencias

- **Regla 5.1**: No agregar dependencias sin evaluar su madurez, mantenimiento y superficie de ataque. Preferir librerías con mantenimiento activo y auditorías de seguridad.
- **Regla 5.2**: Ejecutar `npm audit` (frontend) y `pip-audit` o `safety` (backend) en CI. No permitir dependencias con vulnerabilidades conocidas sin parche disponible.
- **Regla 5.3**: Congelar versiones de dependencias en `package.json` y `requirements.txt`. No usar rangos abiertos (`^`, `>=`) sin lockfile.

## 6. Logging y Trazabilidad

- **Regla 6.1**: Usar el módulo `logging` de Python (no `print()`). Configurar niveles: DEBUG en desarrollo, INFO en producción.
- **Regla 6.2**: Incluir en cada log: `request_id`, `company_id`, `user_id`, `action`. No incluir: tokens, contraseñas, números de documento completos (masked).
- **Regla 6.3**: Los errores de seguridad (autenticación fallida, tokens inválidos, intentos de acceso a recursos ajenos) deben loguearse con nivel WARNING o superior.

## 7. Transporte y Comunicaciones

- **Regla 7.1**: Todo tráfico entre frontend y backend debe ser HTTPS. No enviar tokens ni datos sensibles por HTTP plano.
- **Regla 7.2**: Toda comunicación con servicios externos (SUNAT SOAP, Gemini, RENIEC) debe ser HTTPS. Validar certificados TLS. No deshabilitar verificación.
- **Regla 7.3**: No permitir CORS con `allow_origins=["*"]` en producción. Listar orígenes específicos.

## 8. Datos Personales (Privacidad)

- **Regla 8.1**: Los números de documento (RUC, DNI) y direcciones se consideran datos personales. Su almacenamiento y transmisión deben ser mínimos necesarios para la operación.
- **Regla 8.2**: No loguear números de documento completos. Si es necesario para trazabilidad, registrar solo los últimos 4 dígitos.
- **Regla 8.3**: La tabla `profiles` contiene datos personales. Su acceso está restringido por RLS y por la lógica de aplicación.
