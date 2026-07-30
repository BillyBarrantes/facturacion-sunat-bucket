---
name: billing-domain-peru
description: Reglas del dominio de facturación electrónica peruana (SUNAT). Define qué exige el fisco peruano para la emisión de comprobantes electrónicos. Úsala al construir o modificar XML UBL 2.1, manejar series/correlativos, calcular IGV y otros tributos, procesar CDR, generar CDR para SIRE, o gestionar certificados CDT. No la uses para reglas de integridad técnica o auditoría de datos (ver data-integrity-and-audit) ni para seguridad del stack (ver secure-backend).
---

# Dominio de Facturación Electrónica Perú — SUNAT

Esta skill define las reglas tributarias y de negocio que SUNAT exige. Complementa a `data-integrity-and-audit` (integridad técnica) y `enterprise-architecture` (flujo entre capas).

## 1. Tipos de Comprobante (CPE)

| Código | Tipo | Uso |
|---|---|---|
| `01` | Factura Electrónica | Operaciones con RUC (crédito fiscal, costos, gastos) |
| `03` | Boleta de Venta | Consumidor final (sin efectos tributarios para el comprador) |
| `07` | Nota de Crédito | Anular o reducir montos de comprobantes aceptados |
| `08` | Nota de Débito | Incrementar montos de comprobantes aceptados |
| `09` | Guía de Remisión | Sustentar traslado de bienes (futuro) |

### Reglas de tipo
- Facturas (01) solo se emiten a receptores con **RUC** (tipo_doc=6). No existe factura a DNI.
- Boletas (03) pueden emitirse sin documento (`0`: "Sin Documento"), con DNI (1) o con RUC (6).
- Si una Boleta supera los S/ 700.00, es obligatorio registrar el tipo y número de documento del receptor (RUC o DNI), más su nombre completo y dirección.

## 2. Series y Numeración

### Reglas de series
| Tipo | Serie | Rango |
|---|---|---|
| Factura | F001 - F999 | Tradicional |
| Factura Electrónica | FF01 - FF99 | Para emisores con más de 99 series |
| Boleta | B001 - B999 | Tradicional |
| Nota Crédito Factura | FC01 - FC99 | Vinculada a serie F |
| Nota Débito Factura | FD01 - FD99 | Vinculada a serie F |
| Nota Crédito Boleta | BC01 - BC99 | Vinculada a serie B |
| Nota Débito Boleta | BD01 - BD99 | Vinculada a serie B |

- La serie se asigna al momento de crear el comprobante y no cambia.
- El número correlativo es por serie: cada serie tiene su propio contador.
- El número correlativo se asigna secuencialmente. No puede haber saltos ni números reutilizados. Si un comprobante se rechaza antes de enviar a SUNAT, el número ya fue reservado y no se reusa.
- El formato de presentación es `{SERIE}-{NUMERO:08d}` (ej: `F001-00000001`).

## 3. Cálculo de IGV

### Regla general
- IGV = 18% de la base imponible.
- El IGV se calcula sobre el **valor de venta** (base imponible), no sobre el precio total.
- El precio final (con IGV) = valor de venta × 1.18.

### Precio incluido IGV (modo INC)
Si el usuario ingresa el precio con IGV incluido (precio final):
- Valor unitario (base) = precio_unitario / 1.18 (redondeado a 4 decimales)
- IGV del ítem = precio_unitario - valor_unitario

### Precio sin IGV (modo SIN)
Si el usuario ingresa el precio sin IGV (valor de venta):
- Precio unitario (final) = valor_unitario × 1.18
- IGV del ítem = valor_unitario × 0.18

### Tabla de operaciones gravadas
| Código | Tipo | IGV |
|---|---|---|
| `10` | Gravado - Operación Onerosa | 18% |
| `20` | Exonerado | 0% |
| `30` | Inafecto | 0% |
| `40` | Exportación | 0% |
| `50` | Operaciones gratuitas | Simulado |

## 4. Estructura UBL 2.1

### Factura Electrónica (01)
La plantilla XML (`templates/xml/factura_01.xml.j2`) debe generar:
- `cbc:UBLVersionID` = `2.1`
- `cbc:CustomizationID` = `2.0`
- `cbc:InvoiceTypeCode` = `01` (con `listID="0101"`)
- Firma digital inyectada dentro de `<ext:ExtensionContent>` (lo maneja `signer.py`)
- Monto en letras en `cbc:Note` con `languageLocaleID="1000"`
- Código QR generado con la cadena oficial SUNAT

### Boleta de Venta (03)
Misma estructura que Factura pero con:
- Elemento raíz `<Invoice>` con namespaces de Boleta (difiere solo en tipo)
- `cbc:InvoiceTypeCode` = `03`
- Para clientes "Sin Documento": `cbc:ID` = `-` y `cac:PartyLegalEntity/cbc:RegistrationName` = `CLIENTES VARIOS` (o en blanco)

### Reglas de XML
- Los nombres de empresa y cliente deben escaparse en CDATA (`<![CDATA[...]]>`).
- Los montos en `cbc:PriceAmount` deben tener 4 decimales. Los montos impositivos y totales, 2 decimales.
- El XML debe ser válido contra el XSD de SUNAT antes de firmarse. No firmar XML inválido.

## 5. Envío SOAP a SUNAT

### Endpoints
- **BETA**: `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService`
- **PRODUCCIÓN**: `https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService`

### Formato
- El XML firmado se empaqueta en ZIP (con el nombre `{RUC}-{TIPO}-{SERIE}-{NUMERO}.xml` dentro del ZIP).
- El ZIP se codifica en Base64 y se envía en el envelope SOAP.
- Autenticación: `UsernameToken` con `{RUC}{SOL_USER}` y `SOL_PASS`.

### Procesamiento de respuesta
- Status HTTP 200 no es equivalente a "aceptado". Hay que extraer el CDR del `applicationResponse`.
- Códigos de respuesta en CDR:
  - `0` = **Aceptado**
  - `4xxx` = **Observado** (ej: `4910`: observación de forma)
  - `2xxx` = **Rechazado** (ej: `2010`: RUC del emisor no existe)
  - `1xxx` = **Error de sistema**

### Tiempos de respuesta
- SUNAT puede responder con CDR en segundos o hasta 30 minutos (procesamiento batch para ciertos horarios).
- Si no hay respuesta después de 30s, el comprobante queda en estado `PENDIENTE` y debe consultarse el CDR más tarde mediante `getStatus`.

## 6. CDT (Certificado Digital Tributario)

- Para producción, cada empresa debe tener un CDT emitido por una entidad certificadora autorizada por SUNAT.
- El CDT tiene formato PKCS#12 (`.pfx`) con clave privada y certificado.
- El certificado debe estar vigente (no expirado) al momento de firmar.
- El CDT se almacena en R2, en la ruta `{company_id}/certificates/`. La contraseña se guarda en la tabla `companies.cdt_password_encrypted`, encriptada con una clave de aplicación.
- Para pruebas en BETA, se permite el certificado autofirmado generado por `signer.py`, pero debe documentarse que no es válido en producción.

## 7. SIRE (Sistema Integrado de Registros Electrónicos)

- El reporte SIRE de Ventas debe estructurarse según el formato oficial. Versión actual: **SIRE 2.0**.
- Columnas mínimas requeridas: Periodo, CAR SUNAT, Fecha Emisión, Tipo CPE, Serie CPE, Número CPE, Tipo Doc Cliente, N° Doc Cliente, Razón Social Cliente, Base Imponible, IGV, Importe Total, Estado SUNAT.
- El periodo se formatea como `{YYYYMM}00`.
- El CAR (Clave de Archivo) se construye: `{TIPO}{SERIE}{NUMERO:08d}`.
- El archivo debe entregarse en formato Excel (.xlsx) o TXT con estructura fija.

## 8. Monto en Letras

El campo `cbc:Note` debe contener el monto total expresado en letras, siguiendo el formato:
```
SON: {TEXTO} CON {DECIMALES}/100 {SOLES|DÓLARES AMERICANOS}
```
Ejemplo: `SON: CIENTO CINCUENTA Y TRES CON 40/100 SOLES`

La función `numero_a_letras` en `sunat_builder.py` implementa la conversión. Solo cubre montos hasta 999.99 correctamente. Para montos mayores (miles, millones), debe extenderse.
