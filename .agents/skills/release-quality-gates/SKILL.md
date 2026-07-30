---
name: release-quality-gates
description: Define los quality gates que todo cambio debe superar antes de integrarse y liberarse. Úsala al preparar un PR, un release, o al configurar CI/CD. No la uses para reglas de codificación (ver secure-*), contratos API (ver api-contracts-and-regressions), ni dominio de negocio (ver billing-domain-peru).
---

# Quality Gates — Release y CI

Esta skill define qué controles se aplican en cada etapa. Los gates están organizados en **3 niveles** con severidad explícita. Ningún gate puede saltarse sin autorización documentada.

## Nivel 1: 🔴 Gates Bloqueantes para PR

Impiden que el PR se mergee. Si falla alguno, el PR queda en rojo.

- **🔴 Lint**: `npm run lint` en frontend. Cero errores de ESLint. Warnings se revisan pero no bloquean.
- **🔴 TypeScript**: `npx tsc --noEmit` en frontend. Cero errores de tipo.
- **🔴 Build**: `npm run build` en frontend. Build exitoso.
- **🔴 Tests backend**: `pytest backend/tests/` (o `python -m pytest`). Todos los tests deben pasar. No permitir tests saltados (`@pytest.mark.skip`) sin ticket.
- **🔴 Tests de contrato**: Ejecutar contract tests de todos los endpoints afectados por el cambio. Si no existen contract tests para el endpoint, deben crearse en el mismo PR.
- **🔴 Seguridad básica**: Verificar que no se introdujeron secrets nuevos en el código. Usar `git diff` contra `main` para detectar strings con formato de API key, password o token.
- **🔴 Dependencias**: `npm audit --audit-level=high` no debe reportar vulnerabilidades HIGH o CRITICAL sin fix.

## Nivel 2: 🟡 Gates Bloqueantes para Release

Impiden que el release se genere (tag o deploy a producción). Se ejecutan después de que el PR está en `main`.

- **🟡 Tests de integración**: Pruebas que requieren entorno completo (BD, servicios externos mockeados). Deben pasar en staging antes del release.
- **🟡 Security scan completo**: Ejecutar Semgrep (o similar) sobre todo el código del release. No permitir hallazgos de severidad HIGH o CRITICAL en categorías: `auth`, `sql-injection`, `xss`, `hardcoded-secrets`, `path-traversal`.
- **🟡 Análisis de regresiones**: Comparar schemas de API del release actual vs release anterior. Si hay cambios rompientes no versionados, el release se bloquea.
- **🟡 Cobertura de tests**: La cobertura no debe disminuir más de 2% respecto al release anterior. No se exige un mínimo absoluto (se parte del estado actual), pero no se permite degradación significativa.
- **🟡 Changelog**: El release debe tener un changelog que documente cambios, bug fixes, breaking changes y dependencias actualizadas.
- **🟡 Database migration**: Si el release incluye migraciones de BD, deben ser reversibles (down migration). Si no son reversibles, requiere aprobación explícita por escrito.

## Nivel 3: 🔵 Checks Informativos / No Bloqueantes

Se ejecutan y reportan, pero no bloquean el PR ni el release. Sirven para visibilidad y mejora continua.

- **🔵 Cobertura de tests**: Reportar cobertura actual y delta. Sin umbral mínimo, pero visible en el PR.
- **🔵 Calidad de código**: Ejecutar linter con reglas adicionales (complejidad ciclomática, funciones muy largas, duplicación). Reportar sin bloquear.
- **🔵 Bundle size**: Reportar tamaño del bundle frontend. Si aumenta más de 10%, notificar.
- **🔵 Dependencias desactualizadas**: Listar dependencias con versiones mayores detrás.
- **🔵 Licencias**: Verificar que no se introdujeron dependencias con licencias incompatibles (GPL, AGPL, etc.).
- **🔵 Rendimiento**: Ejecutar pruebas de rendimiento básicas en endpoints críticos (`/emitir`, `/comprobantes`). Reportar tiempos. No bloquear, pero alertar si se degradan.

## 2. Ejecución en CI/CD

### Pipeline de PR
```yaml
# Orden secuencial. Si un paso 🔴 falla, el pipeline se detiene.
steps:
  - 🔴 Lint frontend
  - 🔴 TypeScript check
  - 🔴 Lint backend (si existe config)
  - 🔴 Test backend (unit + contract)
  - 🔴 Build frontend
  - 🔴 Security: secrets diff
  - 🔴 npm audit
  - 🔵 Cobertura (report)
  - 🔵 Bundle size (report)
```

### Pipeline de Release
```yaml
steps:
  - 🔴 Repetir todos los gates de PR
  - 🟡 Deploy a staging
  - 🟡 Integration tests en staging
  - 🟡 Semgrep scan full
  - 🟡 Análisis de regresiones de API
  - 🟡 Verificar down migrations
  - 🟡 Changelog validation
  - 🔵 Performance tests
  - 🔵 Licencias
  # Si todo pasa → tag release + deploy a producción
```

## 3. Excepciones

- Cualquier gate 🔴 o 🟡 puede omitirse solo con una **excepción documentada** aprobada por al menos 2 personas del equipo (incluyendo un tech lead).
- La excepción debe especificar: gate omitido, razón, riesgo aceptado, y fecha de remediación.
- Las excepciones vencen. Si no se remedia en el plazo acordado, el gate se reactiva automáticamente.
- Las excepciones se registran en un archivo `EXCEPTIONS.md` en la raíz del proyecto.

## 4. Monitoreo de Gates

- Cada release debe publicar un reporte de gates con el estado de cada uno (passed/failed/skipped).
- Si un gate 🔵 informativo falla consistentemente (3 releases seguidos), debe evaluarse si se promueve a 🟡.
- Si un gate 🔴 nunca falla (12+ releases), debe evaluarse si sigue siendo necesario o si ya es parte de la cultura del equipo y puede simplificarse.

## 5. Definiciones

- **PR**: Pull Request contra `main`. El pipeline de PR se ejecuta en cada push.
- **Release**: Tag semántico en `main` (ej: `v1.2.3`). El pipeline de release se ejecuta manualmente o por evento de tag.
- **Staging**: Entorno que replica producción (misma infraestructura, mismos servicios externos con configuraciones de prueba).
