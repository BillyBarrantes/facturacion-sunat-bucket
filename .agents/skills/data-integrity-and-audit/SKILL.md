---
name: data-integrity-and-audit
description: Garantiza la integridad técnica, trazabilidad e inmutabilidad de los datos financieros en FACTURACION-SUNAT. Úsala al modificar tablas de datos transaccionales (comprobantes, compras, caja_movimientos), al implementar lógica de reconciliación, o al diseñar mecanismos de backup y restauración. No la uses para reglas tributarias peruanas (ver billing-domain-peru) ni para seguridad de API (ver secure-backend).
---

# Integridad de Datos y Auditoría

Esta skill define cómo se garantiza que los datos financieros no se alteren indebidamente, se auditen y se reconcilien. Complementa a `billing-domain-peru` (que define *qué* exige el fisco): aquí se define *cómo* se protege la integridad de esos datos.

## 1. Inmutabilidad de Comprobantes

- **Regla 1.1**: Un comprobante emitido y aceptado por SUNAT (estado `ACEPTADO`) no puede ser modificado. Ni sus campos de cabecera, ni sus ítems, ni sus montos.
- **Regla 1.2**: Si se necesita corregir un comprobante aceptado, el flujo correcto es emitir una **Nota de Crédito** (tipo 07) o **Nota de Débito** (tipo 08). No existe edición in-place.
- **Regla 1.3**: Los comprobantes en estado `PENDIENTE` o `RECHAZADO` pueden editarse (corregir datos y reenviar), pero cada modificación debe registrarse en una tabla de `audit_log`.
- **Regla 1.4**: El campo `hash_cpe` del comprobante es el digest SHA256 del XML firmado. Si se modifica cualquier campo del comprobante, el hash deja de coincidir con el XML almacenado. Esto es intencional: es el mecanismo de detección de manipulación.

## 2. Cadena de Hash (Hash Chain)

- **Regla 2.1**: Cada comprobante tiene un `hash_cpe` que es el SHA256 truncado a 28 caracteres del XML firmado enviado a SUNAT. Este hash debe almacenarse en la tabla `comprobantes`.
- **Regla 2.2**: El hash se genera DESPUÉS de firmar digitalmente y ANTES de enviar a SUNAT. Es el hash del XML que realmente se envió, no de un estado previo.
- **Regla 2.3**: En un esquema de hash chain completo, cada comprobante incluiría el hash del comprobante anterior de la misma serie. Esto permite detectar si faltan comprobantes en el medio. Implementar cuando se requiera auditoría de integridad continua.
- **Regla 2.4**: El hash debe poder recalcularse offline: dado el XML firmado y el algoritmo, cualquier auditor puede verificar que el `hash_cpe` en BD coincide.

## 3. Auditoría de Cambios (Audit Log)

- **Regla 3.1**: Crear una tabla `audit_log` con los siguientes campos mínimos:
  ```
  id UUID, table_name VARCHAR, record_id UUID, action VARCHAR (INSERT/UPDATE/DELETE),
  old_data JSONB, new_data JSONB, changed_by UUID, company_id UUID, 
  changed_at TIMESTAMPTZ DEFAULT NOW()
  ```
- **Regla 3.2**: Toda modificación de datos financieros debe registrarse en `audit_log`. Esto incluye: cambios de estado en comprobantes, modificación de clientes (cambios de razón social), modificaciones de productos, cambios en configuración de empresa (SOL user, certificados).
- **Regla 3.3**: El `audit_log` es de solo inserción. Nadie puede modificar o eliminar registros de auditoría. Su política RLS es `FOR INSERT WITH CHECK (true)` pero sin permisos de UPDATE/DELETE para nadie.
- **Regla 3.4**: Los cambios de estado de comprobante (`PENDIENTE → ACEPTADO`, `PENDIENTE → RECHAZADO`, etc.) deben registrarse con el código de respuesta de SUNAT y el mensaje original.

## 4. Trazabilidad de Estados (State Machine)

- **Regla 4.1**: El campo `estado_sunat` sigue una máquina de estados estricta. Las transiciones permitidas son:
  ```
  PENDIENTE → ACEPTADO
  PENDIENTE → RECHAZADO
  PENDIENTE → OBSERVADO
  OBSERVADO → PENDIENTE (tras corrección y reenvío)
  ACEPTADO → ANULADO (solo si hay comunicación oficial de SUNAT o proceso interno)
  RECHAZADO → PENDIENTE (tras corrección y reenvío)
  ```
- **Regla 4.2**: Cualquier transición de estado debe ser atómica: la actualización del estado y el registro en `audit_log` deben ocurrir en la misma transacción de BD.
- **Regla 4.3**: No existen transiciones directas no listadas (ej: de `RECHAZADO` a `ACEPTADO` sin pasar por `PENDIENTE`).

## 5. Reconciliación

- **Regla 5.1**: Periódicamente (diario, semanal), ejecutar una reconciliación entre el estado local y el estado en SUNAT. Consultar el CDR o el portal SUNAT para verificar que los comprobantes marcados como `ACEPTADO` realmente existen en SUNAT.
- **Regla 5.2**: Si un comprobante está como `ACEPTADO` en BD pero no existe en SUNAT (o viceversa), generar una alerta. El sistema no debe auto-corregir: requiere intervención manual.
- **Regla 5.3**: La reconciliación de SIRE (Registro de Ventas) debe comparar los datos locales con lo declarado a SUNAT. Cualquier discrepancia debe documentarse.

## 6. Backup y Restauración

- **Regla 6.1**: La base de datos debe tener backups automáticos diarios. Supabase ofrece Point-in-Time Recovery (PITR). Verificar que esté habilitado.
- **Regla 6.2**: Los archivos en R2 (XML firmados, CDR, PDFs) deben tener versionado habilitado. Un XML firmado enviado a SUNAT nunca debe perderse.
- **Regla 6.3**: Documentar y probar el procedimiento de restauración al menos una vez por trimestre. Incluir: restaurar BD a un punto anterior, verificar que hash_cpe coincida con XML en R2.
- **Regla 6.4**: Si se restaura una BD a un estado anterior, todos los comprobantes emitidos después de ese punto deben reenviarse a SUNAT (o verificarse contra el CDR).

## 7. Consistencia de Correlativos

- **Regla 7.1**: El número correlativo de un comprobante se asigna en el momento de la inserción en BD, dentro de la misma transacción que registra el envío a SUNAT. No debe asignarse antes del envío.
- **Regla 7.2**: Si un comprobante se rechaza y se corrige, el número asignado no debe reutilizarse. El número ya fue generado: si el XML se envió a SUNAT (aunque sea rechazado), ese número queda ocupado.
- **Regla 7.3**: La función `COALESCE(MAX(numero), 0) + 1` para asignar correlativo debe ejecutarse con `SELECT ... FOR UPDATE` o dentro de una transacción serializable para evitar race conditions.

## 8. Reglas para el Código

- **Regla 8.1**: No borrar registros de `comprobantes`, `comprobante_detalles`, `clientes` ni `compras`. Usar flags de estado (`activo`, `anulado`, `archivado`).
- **Regla 8.2**: Si se requiere eliminar un registro por error de carga, debe hacerse mediante una migración versionada, no desde la aplicación.
- **Regla 8.3**: Toda operación que modifique montos o estados debe estar dentro de una transacción explícita (`BEGIN/COMMIT/ROLLBACK`).
