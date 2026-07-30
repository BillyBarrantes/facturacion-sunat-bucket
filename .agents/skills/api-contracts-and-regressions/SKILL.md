---
name: api-contracts-and-regressions
description: Previene regresiones y desconexiones entre frontend y backend mediante contratos explícitos. Úsala al crear o modificar endpoints REST, schemas Pydantic, tipos TypeScript de respuesta, o al hacer cambios que afecten la interfaz entre frontend y backend. Complementa a secure-backend (validación) y release-quality-gates (ejecución en CI).
---

# Contratos API y Prevención de Regresiones

## 1. Principio de Contrato

Cada endpoint REST tiene un **contrato explícito**: schema de request + schema de response. Estos schemas son la fuente de verdad compartida entre frontend y backend.

- El backend define el contrato (Pydantic models en los routers).
- El frontend replica el contrato (interfaces TypeScript en `src/lib/api-types.ts` o similar).
- Ningún cambio en un endpoint puede hacerse sin actualizar ambos lados en el mismo PR.

## 2. Reglas de Compatibilidad

### Cambios que NO rompen el contrato (backward-compatible)
- Agregar un campo opcional al response.
- Agregar un campo opcional al request.
- Relajar una validación (ej: max_length de 255 a 512).
- Agregar un nuevo endpoint.

### Cambios que SÍ rompen el contrato (requieren versión nueva o coordinación)
- Eliminar un campo del response.
- Cambiar el tipo de un campo existente (string → number, int → float).
- Hacer obligatorio un campo que antes era opcional.
- Cambiar el nombre de un campo.
- Cambiar la estructura anidada de un objeto.
- Cambiar el formato de una fecha (YYYY-MM-DD → DD/MM/YYYY).
- Cambiar el código de estado HTTP de un endpoint exitoso.

### Regla de versionado
- Si el cambio es rompiente y no se puede evitar, crear un nuevo endpoint con `v2` en la ruta.
- El endpoint anterior debe mantenerse con un deprecation warning por al menos 1 ciclo de release.
- Documentar la deprecación en la respuesta (`"deprecated": true`).

## 3. Schemas Pydantic — Reglas

- **Regla 3.1**: Todo endpoint debe tener un response model explícito (`response_model=...` en el decorador). No retornar dicts genéricos.
- **Regla 3.2**: Los schemas de request deben usar `Field()` con validaciones concretas: `min_length`, `max_length`, `gt`, `regex`, `example`.
- **Regla 3.3**: No reusar el mismo schema para request y response a menos que sean idénticos en estructura y validación.
- **Regla 3.4**: Los campos opcionales deben marcarse con `Optional[T]` y default explícito. No mezclar `Optional` sin default con campos requeridos.
- **Regla 3.5**: Para listas, especificar el tipo del ítem. No usar `list` genérico.

## 4. TypeScript — Sincronización

- **Regla 4.1**: Cada schema Pydantic del backend debe tener una interfaz TypeScript correspondiente en el frontend. La interfaz debe reflejar exactamente la estructura (nombres, tipos, opcionalidad).
- **Regla 4.2**: Los montos monetarios son `number` en TypeScript, `float` en Python. No usar `string` para montos.
- **Regla 4.3**: Los enum-like fields (tipo_comprobante, estado_sunat) deben tener tipos union (`'01' | '03'`) en TypeScript.
- **Regla 4.4**: Al cambiar un schema Pydantic, actualizar las interfaces TypeScript en el mismo commit. Si se olvida, el error se detecta en el siguiente paso.

## 5. Contract Tests

Cada endpoint debe tener un contract test que verifique:

```
Request válido → Response con schema esperado + status code esperado
Request inválido → Response con error + status code 4xx
```

- **Regla 5.1**: Los contract tests verifican forma, no lógica de negocio. No prueban que el IGV esté bien calculado, solo que la respuesta tiene la estructura correcta.
- **Regla 5.2**: Los contract tests se ejecutan en CI antes de los tests de integración. Son rápidos (< 1s por endpoint).
- **Regla 5.3**: Si un endpoint cambia su schema, los contract tests deben fallar hasta que se actualicen. Eso fuerza al desarrollador a decidir: ¿es un cambio rompiente o no?

## 6. Prevención de Regresiones

- **Regla 6.1**: No eliminar campos del response sin verificar que ningún cliente (frontend, API consumers) los usa. Si no hay forma de saberlo, agregar el campo como `deprecated` antes de eliminarlo.
- **Regla 6.2**: Los endpoints de listado (`GET /comprobantes`, `GET /dashboard/metrics`) no deben cambiar el orden de los fields ni su formato sin versionado.
- **Regla 6.3**: Si un endpoint cambia su lógica interna, pero no su contrato, los contract tests deben seguir pasando. Si fallan, el cambio no es solo interno.
- **Regla 6.4**: Detectar N+1 queries: si un endpoint de lista hace una consulta por cada ítem (como `listar_comprobantes` que consulta detalles por cada comprobante), documentarlo y planificar optimización.

## 7. Documentación del Endpoint

- **Regla 7.1**: Todo endpoint debe tener docstring que describa qué hace, qué recibe y qué retorna. Incluir ejemplos de uso.
- **Regla 7.2**: Los códigos de error documentados en el docstring. Si un endpoint puede retornar 400, 401, 403, 404, 422, 500, listarlos.
- **Regla 7.3**: Mantener el OpenAPI generado por FastAPI como documentación viva. No escribir documentación API separada que pueda quedar obsoleta.
